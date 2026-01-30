import Link from "next/link";
import { getLibrarySorted } from "@/lib/storage";

export default function LibraryPage() {
  const library = getLibrarySorted();

  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Audio Library</h1>
        <p>Browse and stream the latest guided audio sessions.</p>
      </section>
      <section className="grid grid-3">
        {library.map((item) => (
          <Link key={item.id} href={`/library/${item.id}`}>
            <div className="card">
              <img
                src={item.coverUrl}
                alt={`${item.title} cover`}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  marginBottom: 12
                }}
              />
              <strong>{item.title}</strong>
              <p style={{ color: "#4b5563" }}>{item.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
