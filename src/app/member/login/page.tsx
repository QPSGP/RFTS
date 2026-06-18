import UserAuth from "@/components/UserAuth";
import SiteFooter from "@/components/SiteFooter";

function firstQuery(v: string | string[] | undefined): string | undefined {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

type MemberLoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function MemberLoginPage({ searchParams = {} }: MemberLoginPageProps) {
  const err = firstQuery(searchParams.error);
  const resetOk = firstQuery(searchParams.reset) === "success";
  const initialErrorInvalid = err === "invalid";
  const nextRaw = firstQuery(searchParams.next);
  const initialNextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : undefined;

  return (
    <main>
      <section className="hero section">
        <span className="pill">Member Access</span>
        <h1>Log in to start your nightly sessions</h1>
        <p>
          Sign in to access your personalized sessions, goal settings, and subscription
          status.
        </p>
      </section>
      {resetOk && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            borderColor: "#86efac",
            background: "#f0fdf4",
            color: "#166534"
          }}
        >
          Your password was updated. Sign in with your new password.
        </div>
      )}
      <UserAuth initialErrorInvalid={initialErrorInvalid} initialNextPath={initialNextPath} />
      <SiteFooter showCta={false} />
    </main>
  );
}
