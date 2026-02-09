import { listInterests } from "@/lib/db";
import GoalsSelector from "@/components/GoalsSelector";

export default async function GoalsPage() {
  const interests = await listInterests();

  return (
    <main>
      <section className="hero section">
        <span className="pill">Goal Setting</span>
        <h1>Set your priorities</h1>
        <p>Select the focus areas you want your sessions to reinforce.</p>
        <a className="button button-secondary" href="/play-options" style={{ marginTop: 12 }}>
          ← Back to Console
        </a>
      </section>
      <GoalsSelector interests={interests} />
      <section className="section" style={{ textAlign: "center", paddingTop: 24 }}>
        <a className="button button-secondary" href="/play-options">
          ← Back to Console
        </a>
      </section>
    </main>
  );
}
