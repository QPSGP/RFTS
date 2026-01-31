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
      </section>
      <GoalsSelector interests={interests} />
    </main>
  );
}
