const fs = require("fs");
const path = require("path");
const { put } = require("@vercel/blob");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const rootDir = path.join(__dirname, "..");
const audiosDir = path.join(rootDir, "Audios");
const coversDir = path.join(rootDir, "Covers");
const dataDir = path.join(rootDir, "data");
const outFile = path.join(dataDir, "blob-assets.json");

const ensureDataDir = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const listFiles = (dirPath, ext) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs
    .readdirSync(dirPath)
    .filter((file) => file.toLowerCase().endsWith(ext))
    .sort((a, b) => a.localeCompare(b));
};

const contentTypeFor = (file) => {
  if (file.toLowerCase().endsWith(".mp3")) {
    return "audio/mpeg";
  }
  if (file.toLowerCase().endsWith(".png")) {
    return "image/png";
  }
  return "application/octet-stream";
};

const uploadSet = async (dirPath, files, prefix) => {
  const map = {};
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stream = fs.createReadStream(fullPath);
    const blob = await put(`${prefix}/${file}`, stream, {
      access: "public",
      contentType: contentTypeFor(file),
      allowOverwrite: true
    });
    map[file] = blob.url;
    console.log(`Uploaded ${file} -> ${blob.url}`);
  }
  return map;
};

const run = async () => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("Missing BLOB_READ_WRITE_TOKEN env var.");
    process.exit(1);
  }
  ensureDataDir();

  const audioFiles = listFiles(audiosDir, ".mp3");
  const coverFiles = listFiles(coversDir, ".png");

  const audioMap = await uploadSet(audiosDir, audioFiles, "audios");
  const coverMap = await uploadSet(coversDir, coverFiles, "covers");

  const payload = {
    generatedAt: new Date().toISOString(),
    audios: audioMap,
    covers: coverMap
  };

  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${outFile}`);
};

run().catch((error) => {
  console.error("Upload failed:", error);
  process.exit(1);
});
