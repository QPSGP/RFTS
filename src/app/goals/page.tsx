import { getInterests } from "@/lib/storage";

export default function GoalsPage() {
  const interests = getInterests();

  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Goals</h1>
        <p>Select an interest to tailor your listening experience.</p>
      </section>
      <section className="grid">
        {interests.map((interest) => (
          <div key={interest.id} className="card">
            <strong>{interest.name}</strong>
            {interest.description && <p>{interest.description}</p>}
          </div>
        ))}
      </section>
    </main>
  );
}
