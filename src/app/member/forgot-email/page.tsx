import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export default function ForgotEmailPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Member Access</span>
        <h1>Forgot your email?</h1>
        <p>
          We can help you find the email address associated with your Reach For The
          Stars account.
        </p>
      </section>
      <section className="section">
        <div className="card">
          <h2>How to recover your email</h2>
          <ol className="list" style={{ paddingLeft: 20, marginTop: 12 }}>
            <li>
              <strong>Check your inbox.</strong> Search for messages from Reach For
              The Stars or our payment provider (e.g. receipts, welcome emails).
            </li>
            <li>
              <strong>Contact us.</strong> If you still can’t find it, email or call
              and we’ll look up your account using your name or other details.
            </li>
          </ol>
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
