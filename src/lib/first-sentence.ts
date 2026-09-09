/** First sentence of a description, including a trailing . ! or ? when present. */
export function firstSentence(text: string): string {
  const trimmed = (text || "").replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^[\s\S]*?[.!?]+(?=\s|$)/);
  if (match) return match[0].trim();
  return trimmed;
}
