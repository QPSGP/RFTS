import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const audiosDir = path.join(process.cwd(), "Audios");
const coversDir = path.join(process.cwd(), "Covers");

const getContentType = (file: string) => {
  const lower = file.toLowerCase();
  if (lower.endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  return "application/octet-stream";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const file = searchParams.get("file");

  if (!type || !file) {
    return NextResponse.json({ error: "Missing parameters." }, { status: 400 });
  }

  const root = type === "audio" ? audiosDir : type === "cover" ? coversDir : null;
  if (!root) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }

  const resolvedPath = path.join(root, path.basename(file));
  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const stat = fs.statSync(resolvedPath);
  const range = request.headers.get("range");
  const contentType = getContentType(resolvedPath);

  if (!range || type === "cover") {
    const buffer = fs.readFileSync(resolvedPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=3600"
      }
    });
  }

  const bytesPrefix = "bytes=";
  if (!range.startsWith(bytesPrefix)) {
    return NextResponse.json({ error: "Invalid range." }, { status: 416 });
  }

  const rangeParts = range.replace(bytesPrefix, "").split("-");
  const start = parseInt(rangeParts[0] || "0", 10);
  const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : stat.size - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return NextResponse.json({ error: "Invalid range." }, { status: 416 });
  }

  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(resolvedPath, { start, end });

  return new NextResponse(stream as unknown as BodyInit, {
    status: 206,
    headers: {
      "Content-Type": contentType,
      "Content-Length": chunkSize.toString(),
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
