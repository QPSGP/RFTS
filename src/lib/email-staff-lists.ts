/** Named staff/transactional email lists editable in Admin → Email settings. */

export const EMAIL_STAFF_LIST_KEYS = [
  "welcome_cc",
  "staff_bcc",
  "report_issue_to",
  "affiliate_cc",
  "issue_resolved_bcc"
] as const;

export type EmailStaffListKey = (typeof EMAIL_STAFF_LIST_KEYS)[number];

export type EmailStaffListMeta = {
  key: EmailStaffListKey;
  label: string;
  description: string;
  /** When true, at least one address is recommended (report inbox). */
  preferNonEmpty?: boolean;
};

export const EMAIL_STAFF_LIST_META: EmailStaffListMeta[] = [
  {
    key: "welcome_cc",
    label: "Welcome & follow-up CC",
    description:
      "Copied on new-member welcome, Life Guidance interest, and therapist/healer/coach emails (not smoke-test signups)."
  },
  {
    key: "staff_bcc",
    label: "Staff BCC (most transactional mail)",
    description:
      "Blind-copied on password resets and other mail that does not skip staff BCC. Leave empty to disable."
  },
  {
    key: "report_issue_to",
    label: "Report an issue (To)",
    description: "Primary inbox for member and admin issue reports.",
    preferNonEmpty: true
  },
  {
    key: "affiliate_cc",
    label: "Affiliate payout CC",
    description: "Copied on affiliate threshold-reached and payout-sent emails."
  },
  {
    key: "issue_resolved_bcc",
    label: "Issue resolved monitor BCC",
    description:
      "BCC when an issue is marked resolved (also limited by ISSUE_RESOLVED_STAFF_BCC_UNTIL env date)."
  }
];

export function normalizeEmailList(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const e = String(raw || "").trim();
    if (!e) continue;
    const key = e.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function splitEnvList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return normalizeEmailList(raw.split(/[,;]/));
}

/** Seed / env fallbacks when a list has not been saved in the database yet. */
export function defaultEmailsForList(key: EmailStaffListKey): string[] {
  switch (key) {
    case "welcome_cc": {
      const fromEnv = splitEnvList(process.env.WELCOME_EMAIL_CC);
      return fromEnv.length
        ? fromEnv
        : ["terry_bg@msn.com", "Richard@richardleeweatherman.com"];
    }
    case "staff_bcc":
      return splitEnvList(process.env.EMAIL_STAFF_BCC);
    case "report_issue_to": {
      const fromEnv = splitEnvList(process.env.REPORT_ISSUE_EMAIL);
      return fromEnv.length ? fromEnv : ["Richard@richardleeweatherman.com"];
    }
    case "affiliate_cc": {
      const fromEnv = splitEnvList(process.env.AFFILIATE_EMAIL_CC);
      return fromEnv.length ? fromEnv : ["Richard@richardleeweatherman.com"];
    }
    case "issue_resolved_bcc": {
      const fromEnv = splitEnvList(process.env.ISSUE_RESOLVED_STAFF_BCC);
      return fromEnv.length
        ? fromEnv
        : ["Richard@richardleeweatherman.com", "craigmilorogers@gmail.com"];
    }
    default:
      return [];
  }
}

export function isEmailStaffListKey(value: string): value is EmailStaffListKey {
  return (EMAIL_STAFF_LIST_KEYS as readonly string[]).includes(value);
}
