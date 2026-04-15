import UserAuth from "@/components/UserAuth";
import SiteFooter from "@/components/SiteFooter";
import MemberLoginShell from "./MemberLoginShell";

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
  const initialErrorInvalid = err === "invalid";
  const nextRaw = firstQuery(searchParams.next);
  const initialNextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : undefined;

  return (
    <MemberLoginShell>
      <main>
        <section className="hero section">
          <span className="pill">Member Access</span>
          <h1>Log in to start your nightly sessions</h1>
          <p>
            Sign in to access your personalized sessions, goal settings, and subscription
            status.
          </p>
        </section>
        <UserAuth initialErrorInvalid={initialErrorInvalid} initialNextPath={initialNextPath} />
        <SiteFooter showCta={false} />
      </main>
    </MemberLoginShell>
  );
}
