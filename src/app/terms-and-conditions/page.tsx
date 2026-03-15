export default function TermsPage() {
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Terms and Conditions</h1>
        <p>Effective date: January 31, 2026</p>
      </section>
      <div className="grid" style={{ gap: 16 }}>
        <div className="card">
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing or using Reach For The Stars, you agree to these Terms.
            If you do not agree, do not use the service.
          </p>
        </div>
        <div className="card">
          <h2>Eligibility</h2>
          <p>
            You must be at least 18 years old to use the service or have the
            consent of a parent or legal guardian.
          </p>
        </div>
        <div className="card">
          <h2>Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and all activity under your account.
          </p>
        </div>
        <div className="card">
          <h2>Subscriptions and Billing</h2>
          <p>
            Subscription fees are billed through our payment processor. You may
            cancel at any time. Access remains active until the end of the
            current billing period. Refunds are not provided except where
            required by law.
          </p>
        </div>
        <div className="card">
          <h2>Content and Use</h2>
          <p>
            All content is provided for personal use only. You may not copy,
            distribute, or resell content without written permission.
          </p>
        </div>
        <div className="card">
          <h2>Prohibited Conduct</h2>
          <p>
            You agree not to misuse the service, attempt to access other users'
            data, or interfere with system performance or security.
          </p>
        </div>
        <div className="card">
          <h2>Disclaimer</h2>
          <p>
            The service is provided "as is" without warranties of any kind. We
            do not guarantee specific outcomes from use of the service.
          </p>
        </div>
        <div className="card">
          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for
            indirect, incidental, or consequential damages arising from use of
            the service.
          </p>
        </div>
        <div className="card">
          <h2>Termination</h2>
          <p>
            We may suspend or terminate access if you violate these Terms or
            misuse the service.
          </p>
        </div>
        <div className="card">
          <h2>Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the
            service after changes means you accept the updated Terms.
          </p>
        </div>
        <div className="card">
          <h2>Contact Us</h2>
          <p>
            Email:{" "}
            <a href="mailto:customerservice@reachforthestars.today">
              customerservice@reachforthestars.today
            </a>
          </p>
          <p>
            Phone: <a href="tel:+18004625669">800-GOAL-NOW (462-5669)</a>
          </p>
        </div>
      </div>
    </main>
  );
}
