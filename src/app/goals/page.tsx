import { getInterests } from "@/lib/storage";
import GoalsSelector from "@/components/GoalsSelector";

export default function GoalsPage() {
  const interests = getInterests();

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
