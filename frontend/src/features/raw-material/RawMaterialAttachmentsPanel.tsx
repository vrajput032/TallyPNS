import { FileUp, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/apiError";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import type { RawMaterialAttachment } from "./types";
import { useDeleteRawMaterialAttachment, useUploadRawMaterialAttachment } from "./useRawMaterial";

interface RawMaterialAttachmentsPanelProps {
  billId: string;
  attachments: RawMaterialAttachment[] | undefined;
  /** Local files queued before the bill exists (create flow). */
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

export function RawMaterialAttachmentsPanel({
  billId,
  attachments,
  pendingFiles,
  onPendingFilesChange,
}: RawMaterialAttachmentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadRawMaterialAttachment();
  const remove = useDeleteRawMaterialAttachment();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const [busyName, setBusyName] = useState<string | null>(null);

  const isCreateQueue = Boolean(onPendingFilesChange);

  async function handleFiles(input: HTMLInputElement) {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length === 0) return;

    if (isCreateQueue) {
      onPendingFilesChange?.([...(pendingFiles ?? []), ...files]);
      return;
    }

    for (const file of files) {
      setBusyName(file.name);
      try {
        await upload.mutateAsync({ id: billId, file });
        toast.success(`Uploaded ${file.name}`);
      } catch (error: unknown) {
        toast.error(apiErrorMessage(error, `Failed to upload ${file.name}`));
      }
    }
    setBusyName(null);
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Supplier bill PDF or photo (JPG/PNG/WEBP), max 10 MB.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileUp className="size-4" />
          {busyName ? `Uploading ${busyName}…` : "Upload PDF / photo"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.currentTarget)}
        />
      </div>

      {isCreateQueue && (pendingFiles?.length ?? 0) > 0 ? (
        <ul className="grid gap-2">
          {pendingFiles?.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2 truncate">
                <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${file.name}`}
                onClick={() => onPendingFilesChange?.(pendingFiles.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {(attachments?.length ?? 0) > 0 ? (
        <ul className="grid gap-2">
          {attachments?.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 truncate text-primary underline-offset-2 hover:underline"
              >
                {file.mimeType.startsWith("image/") && file.url ? (
                  <img
                    src={file.url}
                    alt=""
                    className="size-10 shrink-0 rounded border object-cover"
                  />
                ) : (
                  <Paperclip className="size-4 shrink-0" />
                )}
                <span className="truncate">{file.fileName}</span>
              </a>
              {allowDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${file.fileName}`}
                  disabled={remove.isPending}
                  onClick={() => {
                    if (!confirm(`Remove ${file.fileName}?`)) return;
                    remove.mutate(
                      { billId, attachmentId: file.id },
                      {
                        onSuccess: () => toast.success("Attachment removed"),
                        onError: (error: unknown) =>
                          toast.error(apiErrorMessage(error, "Failed to remove attachment")),
                      }
                    );
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !isCreateQueue ? (
        <p className="text-sm text-muted-foreground">No bill attached yet.</p>
      ) : null}
    </div>
  );
}
