import { get } from "@vercel/blob";
import { leadScanBlobPathnames, leadScanContentType } from "@/lib/event-lead-scan";

export type EventLeadScanBytes = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/** Fetch a lead-card scan from Vercel Blob. Returns null when missing. */
export async function fetchEventLeadScanFromBlob(
  sourceScanPath: string,
  options?: { preferPreview?: boolean }
): Promise<EventLeadScanBytes | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;
  for (const pathname of leadScanBlobPathnames(sourceScanPath, options)) {
    try {
      const result = await get(pathname, { access: "public" });
      if (!result || result.statusCode !== 200 || !result.stream) continue;
      const buffer = await streamToBuffer(result.stream);
      if (!buffer.length) continue;
      return {
        buffer,
        contentType: result.blob.contentType || leadScanContentType(pathname),
        filename: pathname.split("/").pop() || "scan.jpg"
      };
    } catch {
      continue;
    }
  }
  return null;
}
