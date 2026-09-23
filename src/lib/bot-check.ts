type TurnstileResult = { success?: boolean };

export function honeypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const fax = (body as { fax_number?: unknown }).fax_number;
  return typeof fax === "string" && fax.trim().length > 0;
}

async function turnstileOk(token: string, secret: string): Promise<boolean> {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token })
  });
  if (!response.ok) return false;
  const data = (await response.json()) as TurnstileResult;
  return data.success === true;
}

/** Returns an error message when the submission should be rejected. */
export async function automatedSubmissionError(body: unknown): Promise<string | null> {
  if (honeypotTripped(body)) {
    return "Could not submit that form.";
  }
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return null;
  const token =
    body && typeof body === "object"
      ? (body as { turnstileToken?: unknown }).turnstileToken
      : null;
  if (typeof token !== "string" || !token.trim()) {
    return "Please confirm you are a person and try again.";
  }
  const ok = await turnstileOk(token.trim(), secret);
  if (!ok) return "Please confirm you are a person and try again.";
  return null;
}
