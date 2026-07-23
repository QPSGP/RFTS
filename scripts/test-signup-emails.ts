/**
 * Send signup welcome emails (same templates as POST /api/member/onboarding).
 * Does not create a member account.
 *
 *   SIGNUP_EMAIL_TEST_TO=you@example.com npm run test:signup-emails
 *   SIGNUP_EMAIL_TEST_ALL=1  — also send LGD + therapist/healer/coach follow-ups
 */
import path from "path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env.local") });

import { getWelcomeEmailCcRecipients, sendEmail } from "../src/lib/email";
import {
  getWelcomeEmailContent,
  getLgdInterestEmailContent,
  getTherapistHealerCoachEmailContent
} from "../src/lib/email-templates";

async function main() {
  const to = process.env.SIGNUP_EMAIL_TEST_TO?.trim();
  if (!to) {
    console.error("Set SIGNUP_EMAIL_TEST_TO (recipient for test sends).");
    process.exit(1);
  }

  const firstName = process.env.SIGNUP_EMAIL_TEST_FIRST_NAME?.trim() || "Test";
  const lastName = process.env.SIGNUP_EMAIL_TEST_LAST_NAME?.trim() || "Member";
  const sendAll =
    process.env.SIGNUP_EMAIL_TEST_ALL === "1" || process.env.SIGNUP_EMAIL_TEST_ALL === "true";
  const welcomeCc = await getWelcomeEmailCcRecipients();

  console.log("Signup email test");
  console.log("  to:", to);
  console.log("  cc:", welcomeCc.join(", ") || "(none)");
  console.log("  from:", process.env.EMAIL_FROM || "(default onboarding@resend.dev)");
  console.log("  resend:", process.env.RESEND_API_KEY ? "configured" : "MISSING");
  console.log(
    "  follow-ups:",
    sendAll ? "welcome + LGD + therapist/healer/coach" : "welcome only"
  );
  console.log("");

  let anyFailed = false;

  const welcome = getWelcomeEmailContent(firstName, lastName);
  const welcomeResult = await sendEmail({
    to,
    cc: welcomeCc,
    subject: welcome.subject,
    html: welcome.html,
    text: welcome.text,
    skipStaffBcc: true
  });
  console.log("Welcome:", welcomeResult.ok ? "OK" : `FAIL — ${welcomeResult.error}`);
  if (!welcomeResult.ok) anyFailed = true;

  if (sendAll) {
    const lgd = getLgdInterestEmailContent(firstName);
    const lgdResult = await sendEmail({
      to,
      cc: welcomeCc,
      subject: lgd.subject,
      html: lgd.html,
      text: lgd.text,
      skipStaffBcc: true
    });
    console.log("LGD interest:", lgdResult.ok ? "OK" : `FAIL — ${lgdResult.error}`);
    if (!lgdResult.ok) anyFailed = true;

    const thc = getTherapistHealerCoachEmailContent(firstName);
    const thcResult = await sendEmail({
      to,
      cc: welcomeCc,
      subject: thc.subject,
      html: thc.html,
      text: thc.text,
      skipStaffBcc: true
    });
    console.log("Therapist/healer/coach:", thcResult.ok ? "OK" : `FAIL — ${thcResult.error}`);
    if (!thcResult.ok) anyFailed = true;
  }

  if (anyFailed) process.exit(1);
  console.log("\nDone. Check inbox (and CC) for delivery.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
