"use client";

import Script from "next/script";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

/** Hidden fax field plus Cloudflare Turnstile when the site key is set. */
export default function FormBotFields() {
  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: 1,
          height: 1,
          overflow: "hidden"
        }}
      >
        <label>
          Fax
          <input name="fax_number" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      {siteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={siteKey} />
        </>
      ) : null}
    </>
  );
}

export function readBotFields(form: HTMLFormElement): {
  fax_number: string;
  turnstileToken?: string;
} {
  const data = new FormData(form);
  const fax = String(data.get("fax_number") ?? "");
  const turnstileToken = String(data.get("cf-turnstile-response") ?? "").trim();
  return turnstileToken ? { fax_number: fax, turnstileToken } : { fax_number: fax };
}
