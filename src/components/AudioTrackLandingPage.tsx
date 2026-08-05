import SiteFooter from "@/components/SiteFooter";
import {
  LandingTrialCtaBand,
  LandingTrialCtaButtons,
  LANDING_TRIAL_CTA_LABEL
} from "@/components/LandingTrialCta";
import { libraryItemCoverSrc } from "@/lib/library-display";
import { isMemberLoggedIn } from "@/lib/member-session";
import type { AudioLandingContent } from "@/lib/audio-landing";

export default async function AudioTrackLandingPage({ content }: { content: AudioLandingContent }) {
  const showSignupCta = !(await isMemberLoggedIn());
  const coverSrc = libraryItemCoverSrc({ coverUrl: content.coverUrl });

  return (
    <main>
      <section className="hero section">
        <span className="pill">Guided audio</span>
        <h1>{content.title}</h1>
        {content.skuCode && (
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 0 }}>SKU {content.skuCode}</p>
        )}
        <div
          style={{
            marginTop: 16,
            maxWidth: 320,
            borderRadius: 8,
            overflow: "hidden",
            aspectRatio: "1",
            background: "#f3f4f6"
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverSrc}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
        <p style={{ marginTop: 16, lineHeight: 1.7 }}>{content.summary}</p>
        <div
          className="card"
          style={{
            marginTop: 16,
            marginBottom: 16,
            background: "#f8fafc",
            borderLeft: "4px solid #10b981"
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginTop: 0 }}>
            {content.transcriptLabel}
          </p>
          <p
            style={{
              fontStyle: "italic",
              lineHeight: 1.7,
              marginBottom: 0,
              color: "#334155"
            }}
          >
            &ldquo;{content.transcriptSnippet}&rdquo;
          </p>
        </div>
        {showSignupCta && <LandingTrialCtaButtons signupHref={content.signupHref} />}
      </section>

      {showSignupCta && (
        <LandingTrialCtaBand
          signupHref={content.signupHref}
          body="Set your goals tonight and hear guided audios like this in your nightly rotation - try Reach For The Stars free for 14 days."
        />
      )}

      {showSignupCta && (
        <section className="section">
          <div className="card glow" style={{ textAlign: "center", padding: 28 }}>
            <h2 style={{ marginTop: 0 }}>Hear this in your nightly rotation</h2>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              Set your goals tonight and press Start Session on your first night. Reach For The Stars
              schedules personalized audios while you fall asleep and during sleep.
            </p>
            <a className="button" href={content.signupHref}>{LANDING_TRIAL_CTA_LABEL}</a>
          </div>
        </section>
      )}

      <SiteFooter showStartJourney={false} />
    </main>
  );
}
