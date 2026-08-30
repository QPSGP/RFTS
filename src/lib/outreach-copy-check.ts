/**
 * Catch merged outreach copy that still has empty tokens or leftover holes
 * so we can hold the send instead of guessing fill-ins.
 */

export type OutreachCopyProblem = {
  kind:
    | "leftover_token"
    | "empty_greeting"
    | "empty_subject_name"
    | "dangling_preposition"
    | "missing_site_url";
  token?: string;
  excerpt: string;
  summary: string;
  howToFix: string;
};

const TOKEN_FIX: Record<string, string> = {
  persona:
    "Add a persona on the CRM record, or edit this draft and remove the blank phrase.",
  organization:
    "Add an organization name on the CRM record, or edit the sentence so it does not need one.",
  firstName:
    "Add a first name on the contact, or edit the greeting / subject.",
  contactName: "Add a name on the contact, or edit the greeting.",
  name: "Add a name on the contact, or edit the greeting.",
  lastName: "Add a last name on the contact, or edit that line.",
  siteUrl: "Check the site URL setting, or paste the full https:// link in the draft.",
  yourName: "Edit the sign-off, or send while signed in as admin.",
  refCode: "Add a referral code on the CRM record, or remove that line from the draft."
};

function clip(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function tokenFix(token: string): string {
  return TOKEN_FIX[token] || `Fill {{${token}}} on the CRM record, or edit this draft and remove it.`;
}

export function findOutreachCopyProblems(
  subject: string,
  bodyText: string
): OutreachCopyProblem[] {
  const problems: OutreachCopyProblem[] = [];
  const combined = `${subject}\n${bodyText}`;

  const leftover = combined.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  const seen = new Set<string>();
  for (const match of leftover) {
    const token = match[1];
    if (seen.has(token)) continue;
    seen.add(token);
    problems.push({
      kind: "leftover_token",
      token,
      excerpt: clip(match[0]),
      summary: `Leftover {{${token}}} token.`,
      howToFix: tokenFix(token)
    });
  }

  const greeting = bodyText.match(/^(Hello|Hi|Dear)\s*,/im);
  if (greeting) {
    problems.push({
      kind: "empty_greeting",
      excerpt: clip(greeting[0]),
      summary: "Greeting is missing a name (Hello ,).",
      howToFix: TOKEN_FIX.firstName
    });
  }

  if (/^\s*,/.test(subject)) {
    problems.push({
      kind: "empty_subject_name",
      excerpt: clip(subject),
      summary: "Subject starts with a comma because the name token was empty.",
      howToFix: TOKEN_FIX.firstName
    });
  }

  const dangling = combined.match(/\s+(for|to|with|at)\s+[.?!]/i);
  if (dangling) {
    problems.push({
      kind: "dangling_preposition",
      excerpt: clip(dangling[0]),
      summary: 'A sentence trails off after an empty merge (for example "for .").',
      howToFix: "Edit that sentence so it reads as a complete thought without a blank."
    });
  }

  const missingSite = combined.match(/(?:^|\n|: )\s*(\/(?:signup|play-options|blog|landing|affiliates)[^\s]*)/i);
  if (missingSite) {
    problems.push({
      kind: "missing_site_url",
      excerpt: clip(missingSite[1] || missingSite[0]),
      summary: "A link is missing the site URL.",
      howToFix: TOKEN_FIX.siteUrl
    });
  }

  return problems;
}

export function hasIncompleteOutreachCopy(subject: string, bodyText: string): boolean {
  return findOutreachCopyProblems(subject, bodyText).length > 0;
}

export function formatOutreachCopyBlockReason(problems: OutreachCopyProblem[]): string {
  const first = problems[0];
  if (!first) return "Incomplete copy.";
  const extra = problems.length > 1 ? ` (${problems.length - 1} more issue${problems.length === 2 ? "" : "s"})` : "";
  return `Incomplete copy: ${first.summary}${extra} How to fix: ${first.howToFix}`;
}
