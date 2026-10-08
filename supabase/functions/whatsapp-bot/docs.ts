import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { REQUEST_DOCS_BUCKET } from "./config.ts";
import { downloadMedia } from "./meta/client.ts";
import type { RequiredDoc } from "./types.ts";

/** Mirrors the DocumentUpload.tsx allow-list; anything else falls back to a generic extension. */
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function extensionForMime(mime: string): string {
  return MIME_EXT[mime] ?? "bin";
}

/** Identical convention to src/components/DocumentUpload.tsx's slugify(). */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type DocUploadResult =
  | { status: "ok" }
  | { status: "upload_failed" }
  | { status: "window_closed" }
  | { status: "record_failed" };

/**
 * Downloads a document/image media id, uploads it to the request-docs
 * bucket at the same path convention the website uses, then records it
 * via record_uploaded_document (never a direct insert -- see AGENTS.md).
 */
export async function uploadRequestDocument(
  supabase: SupabaseClient,
  requestId: string,
  doc: RequiredDoc,
  mediaId: string
): Promise<DocUploadResult> {
  let bytes: Uint8Array;
  let mimeType: string;
  try {
    ({ bytes, mimeType } = await downloadMedia(mediaId));
  } catch (err) {
    console.error("downloadMedia failed", err);
    return { status: "upload_failed" };
  }

  const ext = extensionForMime(mimeType);
  const path = `${requestId}/${slugify(doc.en)}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(REQUEST_DOCS_BUCKET)
    .upload(path, bytes, { contentType: mimeType });
  if (uploadError) {
    console.error("storage upload failed", uploadError);
    return { status: "upload_failed" };
  }

  const { error: recordError } = await supabase.rpc("record_uploaded_document", {
    p_request_id: requestId,
    p_doc_label: doc.en,
    p_storage_path: path,
  });
  if (recordError) {
    const message = recordError.message ?? "";
    if (message.includes("no longer accepting uploads")) {
      return { status: "window_closed" };
    }
    console.error("record_uploaded_document failed", recordError);
    return { status: "record_failed" };
  }

  return { status: "ok" };
}
