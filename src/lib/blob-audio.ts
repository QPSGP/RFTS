import { get } from "@vercel/blob";

export function isVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export type OpenedBlobAudio = {
  status: number;
  body: ReadableStream<Uint8Array>;
  headers: { get(name: string): string | null };
};

async function readBlob(
  url: string,
  access: "public" | "private",
  range: string | null
): Promise<OpenedBlobAudio | null> {
  const headers: Record<string, string> = {};
  if (range) headers.range = range;
  const result = await get(url, { access, headers });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const status = result.headers.get("content-range") ? 206 : 200;
  return { status, body: result.stream, headers: result.headers };
}

/** Read a blob with the store token. Private files fail a plain browser fetch. */
export async function openBlobAudio(
  url: string,
  range: string | null
): Promise<OpenedBlobAudio | null> {
  if (!isVercelBlobUrl(url) || !process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;
  try {
    const opened = await readBlob(url, "private", range);
    if (opened) return opened;
  } catch {
    /* public catalog objects are fetched below */
  }
  try {
    return await readBlob(url, "public", range);
  } catch (error) {
    console.error("[blob-audio] read failed", error);
    return null;
  }
}
