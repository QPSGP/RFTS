import UserAuth from "@/components/UserAuth";
import SiteFooter from "@/components/SiteFooter";
import MemberLoginChrome from "./MemberLoginChrome";

export const dynamic = "force-dynamic";

export default function MemberLoginPage() {
  return (
    <MemberLoginChrome>
      <main>
        <section className="hero section">
          <span className="pill">Member Access</span>
          <h1>Log in to start your nightly sessions</h1>
          <p>
            Sign in to access your personalized sessions, goal settings, and subscription
            status.
          </p>
        </section>
        <UserAuth />
        <SiteFooter showCta={false} />
      </main>
    </MemberLoginChrome>
  );
}
