import ModerationQueue from "@/components/ModerationQueue";

export default function ModerationPage() {
  return (
    <main>
      <section style={{ marginBottom: 32 }}>
        <h1>Moderation Console</h1>
        <p>
          Securely review creator submissions, approve content, and maintain
          platform quality with audit-ready workflows.
        </p>
      </section>
      <ModerationQueue />
    </main>
  );
}
