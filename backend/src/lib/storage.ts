import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "./prisma.js";
import { ApiError } from "../middleware/errorHandler.js";

export const PURCHASE_BUCKET = "pns-purchase";
export const PRODUCT_BUCKET = "pns-products";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

let client: SupabaseClient | null = null;
let setupPromise: Promise<void> | null = null;

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_KEY?.trim();
  if (!url || !key) {
    throw new ApiError(
      500,
      "File storage is not configured. Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

async function ensureBucketsAndPolicies() {
  // Create public buckets + open object policies so the anon key can upload.
  // Paths use random cuids so URLs are not enumerable.
  await prisma.$executeRawUnsafe(`
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES
      ('${PURCHASE_BUCKET}', '${PURCHASE_BUCKET}', true, ${MAX_ATTACHMENT_BYTES}),
      ('${PRODUCT_BUCKET}', '${PRODUCT_BUCKET}', true, ${MAX_ATTACHMENT_BYTES})
    ON CONFLICT (id) DO NOTHING
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'pns_purchase_all'
      ) THEN
        CREATE POLICY pns_purchase_all ON storage.objects
          FOR ALL
          USING (bucket_id = '${PURCHASE_BUCKET}')
          WITH CHECK (bucket_id = '${PURCHASE_BUCKET}');
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'pns_products_all'
      ) THEN
        CREATE POLICY pns_products_all ON storage.objects
          FOR ALL
          USING (bucket_id = '${PRODUCT_BUCKET}')
          WITH CHECK (bucket_id = '${PRODUCT_BUCKET}');
      END IF;
    END
    $$;
  `);
}

export async function ensureStorageReady() {
  if (!setupPromise) {
    setupPromise = ensureBucketsAndPolicies().catch((err) => {
      setupPromise = null;
      throw err;
    });
  }
  await setupPromise;
}

export function assertAllowedAttachment(file: Express.Multer.File) {
  const mime = (file.mimetype || "").toLowerCase();
  const name = file.originalname.toLowerCase();
  const okMime = ALLOWED_ATTACHMENT_MIME.has(mime);
  const okExt =
    name.endsWith(".pdf") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");
  if (!okMime && !okExt) {
    throw new ApiError(400, "Only PDF or image files (JPG, PNG, WEBP) are allowed");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new ApiError(400, "File too large (max 10 MB)");
  }
}

export function publicObjectUrl(bucket: string, path: string): string {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  if (!url) return "";
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

export async function uploadObject(params: {
  bucket: string;
  path: string;
  buffer: Buffer;
  mimeType: string;
}) {
  await ensureStorageReady();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(params.bucket).upload(params.path, params.buffer, {
    contentType: params.mimeType,
    upsert: true,
  });
  if (error) {
    throw new ApiError(500, `Upload failed: ${error.message}`);
  }
  return publicObjectUrl(params.bucket, params.path);
}

export async function deleteObject(bucket: string, path: string) {
  if (!path) return;
  try {
    await ensureStorageReady();
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // Best-effort cleanup; DB row may still be removed by caller.
  }
}

export { MAX_ATTACHMENT_BYTES };
