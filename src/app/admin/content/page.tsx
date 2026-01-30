import AdminContent from "@/components/AdminContent";

export default function AdminContentPage() {
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Admin Content Console</h1>
        <p>Manage interests, audio library items, and ordering.</p>
      </section>
      <AdminContent />
    </main>
  );
}
