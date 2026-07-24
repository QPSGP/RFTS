import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth";
import AdminLgdPanel from "@/components/AdminLgdPanel";

export default async function AdminLgdPage() {
  if (!(await isAdminSession())) {
    redirect("/admin/setup");
  }
  return (
    <main>
      <section className="hero section">
        <span className="pill">Admin</span>
        <h1>Life Guidance Discovery</h1>
        <p>
          Super-admin review of electronic LGD intakes, scripts, and production packets. Public and
          member surfaces stay hidden while admin-only mode is on.
        </p>
        <div className="cta-row" style={{ marginTop: 12, gap: 8, flexWrap: "wrap" }}>
          <a className="button button-secondary" href="/admin/content">
            ← Content console
          </a>
          <a className="button button-secondary" href="/voice-recording-agreement">
            Voice recording agreement
          </a>
        </div>
      </section>
      <AdminLgdPanel />
    </main>
  );
}
