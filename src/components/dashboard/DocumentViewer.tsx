type Document = {
  id: string;
  doc_label: string;
  uploaded_at: string;
  url: string | null;
};

export function DocumentViewer({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-zinc-500">No documents uploaded yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {documents.map((doc) => {
        const isPdf = doc.url?.split("?")[0].toLowerCase().endsWith(".pdf");

        return (
          <a
            key={doc.id}
            href={doc.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-zinc-200 hover:border-emerald-400"
          >
            {doc.url && !isPdf ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.url} alt={doc.doc_label} className="h-32 w-full object-cover" />
            ) : (
              <div className="flex h-32 w-full items-center justify-center bg-zinc-50 text-sm text-zinc-500">
                {doc.url ? "Open PDF" : "Link expired"}
              </div>
            )}
            <div className="border-t border-zinc-200 px-3 py-2">
              <p className="truncate text-sm font-medium text-zinc-800">{doc.doc_label}</p>
              <p className="text-xs text-zinc-400">
                {new Date(doc.uploaded_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
