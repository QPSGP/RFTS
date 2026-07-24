import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/auth";
import { listInterests } from "@/lib/db";
import AdminLgdPanel from "@/components/AdminLgdPanel";
import AdminLgdIntakeRunner from "@/components/AdminLgdIntakeRunner";

export default async function AdminLgdPage() {
  if (!(await isAdminSession())) {
    redirect("/admin/setup");
  }
  const interests = await listInterests();

  return (
    <main>
      <section className="hero section">
        <span className="pill">Admin</span>
        <h1>Life Guidance Discovery</h1>
        <p>
          Super-admin access while LGD is admin-only: run the electronic intake for a member, then
          review scripts and production packets. Members and the public do not see this yet.
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
      <AdminLgdIntakeRunner interests={interests} />
      <AdminLgdPanel />
    </main>
  );
}
