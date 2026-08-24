import { FileUp, Paperclip, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PurchaseAttachment } from "./types";
import { useDeletePurchaseAttachment, useUploadPurchaseAttachment } from "./usePurchase";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

interface PurchaseAttachmentsPanelProps {
  billId: string;
  attachments: PurchaseAttachment[] | undefined;
  /** Local files queued before the bill exists (create flow). */
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

export function PurchaseAttachmentsPanel({
  billId,
  attachments,
  pendingFiles,
  onPendingFilesChange,
}: PurchaseAttachmentsPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadPurchaseAttachment();
  const remove = useDeletePurchaseAttachment();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const [busyName, setBusyName] = useState<string | null>(null);

  const isCreateQueue = Boolean(onPendingFilesChange);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const files = Array.from(fileList);

    if (billId === "new" && onPendingFilesChange) {
      onPendingFilesChange([...(pendingFiles ?? []), ...files]);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    for (const file of files) {
      setBusyName(file.name);
      try {
        await upload.mutateAsync({ id: billId, file });
        toast.success(`Uploaded ${file.name}`);
      } catch (error: unknown) {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          `Failed to upload ${file.name}`;
        toast.error(message);
      }
    }
    setBusyName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          PDF or image (JPG/PNG/WEBP), max 10 MB — invoice photos, machine manuals, etc.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="size-4" />
          {busyName ? `Uploading ${busyName}…` : "Upload file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
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
                onClick={() =>
                  onPendingFilesChange?.(pendingFiles.filter((_, i) => i !== index))
                }
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
                <Paperclip className="size-4 shrink-0" />
                <span className="truncate">{file.fileName}</span>
              </a>
              {allowDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate(
                      { billId, attachmentId: file.id },
                      {
                        onSuccess: () => toast.success("Attachment removed"),
                        onError: () => toast.error("Failed to remove attachment"),
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
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      ) : null}
    </div>
  );
}
