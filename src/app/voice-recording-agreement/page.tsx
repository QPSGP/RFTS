import SiteFooter from "@/components/SiteFooter";

export const metadata = {
  title: "Voice Recording Agreement | Reach For The Stars",
  description:
    "Consent terms for recording, storing, and optionally exporting your voice for a customized Goal Manifestation audio."
};

export default function VoiceRecordingAgreementPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Legal</span>
        <h1>Voice Recording &amp; Storage Agreement</h1>
        <p>
          This agreement covers recording your voice on your own device for a customized Goal
          Manifestation audio (“My own voice”), and how Reach For The Stars / Success Center, Inc.
          may store, use, and - with your permission - export that recording.
        </p>
      </section>

      <section className="section" style={{ maxWidth: 720 }}>
        <div className="card" style={{ lineHeight: 1.65 }}>
          <h2 style={{ marginTop: 0 }}>1. Parties</h2>
          <p>
            “You” means the member recording phrases. “We” means Success Center, Inc. and Reach For
            The Stars (reachforthestars.today), including assigned facilitators and production
            partners who need access to produce your audio.
          </p>

          <h2>2. What you grant</h2>
          <p>By checking consent in the Life Guidance Discovery intake (or related form), you grant us a limited license to:</p>
          <ul>
            <li>Capture audio you record on your device for Goal Manifestation production;</li>
            <li>Store that audio securely with your member account and production files;</li>
            <li>Edit, mix, and use the recording solely to create your personalized overnight audio;</li>
            <li>
              Share the file with production staff or systems (including AI / internal synthesis tools
              we operate or authorize) only as needed to produce that audio.
            </li>
          </ul>

          <h2>3. What we do not claim</h2>
          <ul>
            <li>We do not sell your raw voice recording as a standalone product;</li>
            <li>We do not use your voice to advertise unrelated products without a separate written OK;</li>
            <li>You keep ownership of your voice as a personal attribute; this license is for production of your RFTS audio.</li>
          </ul>

          <h2>4. Storage &amp; export</h2>
          <p>
            Recordings are stored with industry-standard access controls. You may request a copy of
            your submitted recording (export) by emailing{" "}
            <a href="mailto:customerservice@reachforthestars.today">
              customerservice@reachforthestars.today
            </a>
            . You may also request deletion; we may retain a production master of the finished Goal
            Manifestation track needed to run your membership schedule unless you also ask to retire
            that track.
          </p>

          <h2>5. Your responsibilities</h2>
          <ul>
            <li>Only record your own voice, or voices you have legal right to record;</li>
            <li>Do not include confidential third-party information you are not allowed to share;</li>
            <li>Use a reasonably quiet environment so production quality is usable.</li>
          </ul>

          <h2>6. AI / internal production</h2>
          <p>
            We may use AI or internal tooling to process, clean, time, or align your phrases with
            music and frequency beds. External studio talent (when used) receives only what is needed
            for your project. Studio fallback (e.g. human voice talent) remains available when AI /
            internal production is not used.
          </p>

          <h2>7. Fairness &amp; withdrawal</h2>
          <p>
            You may withdraw future recording consent by writing to customer service. Withdrawal does
            not require deletion of a finished audio already in your schedule unless you request
            retirement of that track. We may decline or pause production if a recording is unusable
            or consent is unclear - in that case we will offer a professional voice option instead.
          </p>

          <h2>8. Contact</h2>
          <p>
            Questions:{" "}
            <a href="mailto:customerservice@reachforthestars.today">
              customerservice@reachforthestars.today
            </a>{" "}
            · 800-GOAL-NOW (800-462-5669)
          </p>
        </div>
      </section>
      <SiteFooter showCta={false} />
    </main>
  );
}
