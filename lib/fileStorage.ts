import { del, get, put } from "@vercel/blob";
import { randomUUID } from "crypto";

export type StoredFile = {
  url: string | null;
  key: string | null;
  base64: string | null;
  provider: "vercel-blob" | "database";
};

export type ReadStoredFile = {
  bytes: Buffer;
  contentType: string | null;
};

function safeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160) || "file";
}

export async function storeFile(params: {
  companyId: number;
  area: string;
  filename: string;
  mimeType?: string | null;
  bytes: Buffer;
  keepDatabaseFallback?: boolean;
}): Promise<StoredFile> {
  const key = `companies/${params.companyId}/${params.area}/${Date.now()}-${randomUUID()}-${safeName(params.filename)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(key, params.bytes, {
      access: "private",
      contentType: params.mimeType || "application/octet-stream",
      addRandomSuffix: false,
    });
    return {
      url: blob.url,
      key,
      base64: params.keepDatabaseFallback ? params.bytes.toString("base64") : null,
      provider: "vercel-blob",
    };
  }

  return {
    url: null,
    key: null,
    base64: params.bytes.toString("base64"),
    provider: "database",
  };
}

export async function readStoredFile(keyOrUrl: string): Promise<ReadStoredFile | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const blob = await get(keyOrUrl, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null;

  const chunks: Uint8Array[] = [];
  const reader = blob.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return {
    bytes: Buffer.concat(chunks),
    contentType: blob.blob.contentType,
  };
}

export async function deleteStoredFile(key: string | null | undefined) {
  if (!key || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(key);
  } catch (error) {
    console.error("[file-storage:delete]", error);
  }
}
