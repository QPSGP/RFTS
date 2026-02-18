import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function ForgotPasswordLoginPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Admin / Facilitator</span>
        <h1>Forgot your password?</h1>
        <p>
          Password resets for admins and facilitators are handled by your
          organization. Contact your main admin to have your password reset.
        </p>
      </section>
      <section className="section">
        <div className="card">
          <h2>What to do</h2>
          <p>
            If you are an admin or facilitator and cannot sign in, reach out to
            the person who set up your account. They can reset your password
            from the Admin area.
          </p>
          <p style={{ marginTop: 24 }}>
            <Link className="button button-secondary" href="/login">
              Back to login
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter showStartJourney={false} />
    </main>
  );
}
