import json
import os
import re
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "RECORDINGS, BOOKS, & RECOMMENDED READING LIST 2025 1231.pdf"
AUDIO_DIR = ROOT / "Audios"
OUTPUT_PATH = ROOT / "data" / "recording-descriptions.json"


def normalize_code(prefix: str, number: str, suffix: str | None) -> str:
    prefix = prefix.upper()
    number = number.zfill(2) if len(number) == 1 else number
    code = f"{prefix}-{number}"
    if suffix:
        code += f"-{suffix.upper()}"
    return code


def extract_code_from_text(text: str) -> str | None:
    match = re.search(r"\b([A-Z]{1,3})\s*-?\s*(\d{1,3})([A-Z])?\b", text)
    if not match:
        return None
    return normalize_code(match.group(1), match.group(2), match.group(3))


def load_audio_codes() -> set[str]:
    codes: set[str] = set()
    for file in AUDIO_DIR.glob("*.mp3"):
        code = extract_code_from_text(file.name.upper())
        if code:
            codes.add(code)
    return codes


def extract_descriptions() -> dict[str, str]:
    audio_codes = load_audio_codes()
    descriptions: dict[str, str] = {}

    with pdfplumber.open(PDF_PATH) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip() and not re.fullmatch(r"[-–-\s]*\d+\s*[-–-\s]*", line.strip())
    ]

    current_code = None
    buffer: list[str] = []

    def flush():
        nonlocal current_code, buffer
        if not current_code:
            buffer = []
            return
        if current_code in audio_codes and buffer:
            description = " ".join(buffer).strip()
            description = re.sub(r"\s{2,}", " ", description)
            description = re.sub(r"^[A-Z]-\s*\([^)]+\)\s*", "", description)
            description = re.sub(r"^[A-Z]-\s*\*?\s*", "", description)
            descriptions[current_code] = description
        buffer = []

    for line in lines:
        code = extract_code_from_text(line)
        if code and (line.startswith(code.split("-")[0]) or code in line):
            if current_code:
                flush()
            current_code = code
            # Remove the code and any price fragments from the line
            cleaned = re.sub(r"\$?\d+\.?\d*", "", line)
            cleaned = cleaned.replace(code, "")
            cleaned = re.sub(r"\b[A-Z]-\d{1,3}\b", "", cleaned)
            cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" -:;")
            if cleaned:
                buffer.append(cleaned)
            continue

        if current_code:
            # Stop capturing if we hit a clear section boundary
            if line.upper().startswith("BOOK") or line.upper().startswith("ITEMS WE RECOMMEND"):
                flush()
                current_code = None
                continue
            buffer.append(line)

    flush()
    return descriptions


def main():
    if not PDF_PATH.exists():
        raise SystemExit(f"PDF not found: {PDF_PATH}")
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    descriptions = extract_descriptions()
    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(descriptions, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(descriptions)} descriptions to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
