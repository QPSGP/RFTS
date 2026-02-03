import AdminContent from "@/components/AdminContent";
import AdminSubscriptions from "@/components/AdminSubscriptions";
import AdminPlaybackSettings from "@/components/AdminPlaybackSettings";
import AdminModerators from "@/components/AdminModerators";
import ModerationQueue from "@/components/ModerationQueue";
import AdminUsers from "@/components/AdminUsers";
import AffiliateAdmin from "@/components/AffiliateAdmin";

export default function AdminContentPage() {
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Admin Content Console</h1>
        <p>Manage goals, audio library items, and ordering.</p>
      </section>
      <section className="card" style={{ marginBottom: 24 }}>
        <h2>Admin Sections</h2>
        <div className="grid grid-2" style={{ gap: 12, marginTop: 12 }}>
          <a className="button button-secondary" href="#admin-members">
            Members Section
          </a>
          <a className="button button-secondary" href="#admin-moderators">
            Moderators Section
          </a>
          <a className="button button-secondary" href="#admin-affiliates">
            Affiliate Section
          </a>
          <a className="button button-secondary" href="#admin-playback">
            Playback Schedule Section
          </a>
          <a className="button button-secondary" href="#admin-subscriptions">
            Subscription Plans Section
          </a>
          <a className="button button-secondary" href="#admin-goals">
            Goals Section
          </a>
          <a className="button button-secondary" href="#admin-audio-library">
            Audio Library Section
          </a>
        </div>
      </section>
      <section id="admin-members" style={{ marginBottom: 20 }}>
        <details>
          <summary className="section-title">Members Section</summary>
          <AdminUsers />
        </details>
      </section>
      <section id="admin-moderators" style={{ marginBottom: 20 }}>
        <details>
          <summary className="section-title">Moderators Section</summary>
          <AdminModerators />
          <ModerationQueue />
        </details>
      </section>
      <section id="admin-affiliates" style={{ marginBottom: 20 }}>
        <details>
          <summary className="section-title">Affiliate Section</summary>
          <AffiliateAdmin />
        </details>
      </section>
      <section id="admin-playback" style={{ marginBottom: 20 }}>
        <details>
          <summary className="section-title">Playback Schedule Section</summary>
          <AdminPlaybackSettings />
        </details>
      </section>
      <section id="admin-subscriptions" style={{ marginBottom: 20 }}>
        <details>
          <summary className="section-title">Subscription Plans Section</summary>
          <AdminSubscriptions />
        </details>
      </section>
      <AdminContent />
    </main>
  );
}
