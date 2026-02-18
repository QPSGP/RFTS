import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function ForgotPasswordPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Member Access</span>
        <h1>Forgot your password?</h1>
        <p>
          We can help you get back into your Reach For The Stars account.
        </p>
      </section>
      <section className="section">
        <div className="card">
          <h2>How to reset your password</h2>
          <p>
            We don’t offer self-service password reset yet. Contact us and we’ll
            help you reset your password so you can sign in again.
          </p>
          <p style={{ marginTop: 16 }}>
            <strong>Email:</strong>{" "}
            <a href="mailto:customerservice@reachforthestars.today">
              customerservice@reachforthestars.today
            </a>
          </p>
          <p>
            <strong>Phone:</strong>{" "}
            <a href="tel:+18004625669">800-GOAL-NOW (462-5669)</a>
          </p>
          <p style={{ marginTop: 24 }}>
            <Link className="button button-secondary" href="/member/login">
              Back to login
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
