import AdminContent from "@/components/AdminContent";
import AdminSubscriptions from "@/components/AdminSubscriptions";
import AdminPlaybackSettings from "@/components/AdminPlaybackSettings";
import AdminModerators from "@/components/AdminModerators";
import ModerationQueue from "@/components/ModerationQueue";
import AdminUsers from "@/components/AdminUsers";

export default function AdminContentPage() {
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Admin Content Console</h1>
        <p>Manage interests, audio library items, and ordering.</p>
      </section>
      <AdminUsers />
      <AdminModerators />
      <ModerationQueue />
      <AdminPlaybackSettings />
      <AdminSubscriptions />
      <AdminContent />
    </main>
  );
}
