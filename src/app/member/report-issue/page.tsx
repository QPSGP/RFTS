import { redirect } from "next/navigation";
import { getUserSessionEmail } from "@/lib/user-auth";
import ReportIssueForm from "./ReportIssueForm";

export default async function ReportIssuePage() {
  const email = await getUserSessionEmail();
  if (!email) {
    redirect("/member/login?next=/member/report-issue");
  }
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Report an issue</h1>
        <p>
          Found a bug, have a suggestion, or need help? Send us a message and we’ll get back to you.
        </p>
      </section>
      <div className="card" style={{ maxWidth: 560 }}>
        <ReportIssueForm />
      </div>
    </main>
  );
}
