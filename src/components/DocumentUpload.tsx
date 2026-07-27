"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/useTranslation";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function slugify(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Status = "idle" | "uploading" | "done" | "error";

export function DocumentUpload({
  requestId,
  docLabel,
  docLabelDisplay,
}: {
  requestId: string;
  docLabel: string;
  docLabelDisplay: string;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("error");
      setErrorKey("invalidFileType");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setStatus("error");
      setErrorKey("fileTooLarge");
      return;
    }

    setStatus("uploading");
    setErrorKey(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${requestId}/${slugify(docLabel)}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("request-docs")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setStatus("error");
      setErrorKey("errorGeneric");
      return;
    }

    const { error: recordError } = await supabase.rpc("record_uploaded_document", {
      p_request_id: requestId,
      p_doc_label: docLabel,
      p_storage_path: path,
    });

    if (recordError) {
      setStatus("error");
      setErrorKey("errorGeneric");
      return;
    }

    setStatus("done");
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-700">{docLabelDisplay}</span>
        {status === "done" && (
          <span className="text-sm font-medium text-brand-700">{t("intake.uploaded")}</span>
        )}
      </div>

      {status !== "done" && (
        <input
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          disabled={status === "uploading"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
        />
      )}

      {status === "uploading" && (
        <p className="mt-1 text-xs text-zinc-400">{t("intake.uploading")}</p>
      )}
      {status === "error" && errorKey && (
        <p className="mt-1 text-xs text-red-600">{t(`intake.${errorKey}`)}</p>
      )}
    </div>
  );
}
