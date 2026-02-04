export default function PrivacyPolicyPage() {
  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Privacy Policy</h1>
        <p>Effective date: January 31, 2026</p>
      </section>
      <div className="grid" style={{ gap: 16 }}>
        <div className="card">
          <h2>Overview</h2>
          <p>
            Reach For The Stars ("we", "us", "our") respects your privacy. This
            policy explains how we collect, use, and protect your information
            when you use our website and services.
          </p>
        </div>
        <div className="card">
          <h2>Information We Collect</h2>
          <div className="stack">
            <p>
              <strong>Account data:</strong> name, email, password, and profile
              details you provide.
            </p>
            <p>
              <strong>Service data:</strong> goals, preferences, and usage
              activity required to deliver personalized sessions.
            </p>
            <p>
              <strong>Payment data:</strong> handled by our payment processor
              (Stripe). We do not store full card numbers.
            </p>
            <p>
              <strong>Technical data:</strong> device, browser, and basic logs
              for security and performance.
            </p>
          </div>
        </div>
        <div className="card">
          <h2>How We Use Information</h2>
          <div className="stack">
            <p>Provide, personalize, and improve the service.</p>
            <p>Maintain account security and prevent misuse.</p>
            <p>Process billing and subscription management.</p>
            <p>Communicate important updates and support responses.</p>
          </div>
        </div>
        <div className="card">
          <h2>Sharing</h2>
          <p>
            We only share data with trusted providers necessary to operate the
            service (such as hosting and payment processing). We do not sell your
            personal information.
          </p>
        </div>
        <div className="card">
          <h2>Cookies</h2>
          <p>
            We use cookies and similar technologies for authentication, session
            management, and basic analytics. You can adjust cookie settings in
            your browser, but some features may not work properly.
          </p>
        </div>
        <div className="card">
          <h2>Data Retention</h2>
          <p>
            We retain information as long as your account is active or as needed
            to provide services, comply with legal obligations, and resolve
            disputes.
          </p>
        </div>
        <div className="card">
          <h2>Security</h2>
          <p>
            We use reasonable security measures to protect your data. No method
            of transmission or storage is 100% secure.
          </p>
        </div>
        <div className="card">
          <h2>Children's Privacy</h2>
          <p>
            Our services are not directed to children under 13, and we do not
            knowingly collect data from children.
          </p>
        </div>
        <div className="card">
          <h2>Your Choices</h2>
          <p>
            You may request access, correction, or deletion of your information
            by contacting us.
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
