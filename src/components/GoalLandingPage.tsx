import SiteFooter from "@/components/SiteFooter";
import AffiliateSignupLink from "@/components/AffiliateSignupLink";
import {
  LandingTrialCtaBand,
  LandingTrialCtaButtons
} from "@/components/LandingTrialCta";
import RelatedAudioLandings from "@/components/RelatedAudioLandings";
import { isMemberLoggedIn } from "@/lib/member-session";
import type { AudioLandingCard } from "@/lib/audio-landing-relations";
import {
  getRelatedGoalPages,
  GOAL_SIGNUP_HREF,
  type GoalLandingContent
} from "@/lib/goal-landing-pages";

export default async function GoalLandingPage({
  content,
  relatedAudios = [],
  signupHref = GOAL_SIGNUP_HREF
}: {
  content: GoalLandingContent;
  relatedAudios?: AudioLandingCard[];
  signupHref?: string;
}) {
  const showSignupCta = !(await isMemberLoggedIn());
  const related = getRelatedGoalPages(content.relatedSlugs);

  return (
    <main>
      <section className="hero section">
        <span className="pill">{content.label}</span>
        <h1>{content.title}</h1>
        <p style={{ fontSize: 18, color: "#475569", marginTop: 0 }}>{content.tagline}</p>
        <p>{content.heroLead}</p>
        <div
          style={{
            marginTop: 16,
            maxWidth: 640,
            borderRadius: 8,
            overflow: "hidden",
            aspectRatio: "16/10",
            background: "#f3f4f6"
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={content.imageSrc}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: content.imageFit ?? "cover",
              display: "block"
            }}
          />
        </div>
        {showSignupCta && <LandingTrialCtaButtons signupHref={signupHref} />}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">{content.eyebrow}</span>
          <h2 className="section-title">{content.sectionTitle}</h2>
          <p className="section-subtitle">{content.sectionSubtitle}</p>
        </div>
        <div className="grid grid-3">
          {content.howItHelps.map((item) => (
            <div key={item.title} className="card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {showSignupCta && (
        <LandingTrialCtaBand
          signupHref={signupHref}
          body={`Set ${content.label.toLowerCase()} among your goals and listen while you sleep - try Reach For The Stars free for 14 days.`}
        />
      )}

      <RelatedAudioLandings
        heading={`Related audios for ${content.label.toLowerCase()}`}
        audios={relatedAudios}
      />

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Nightly program</span>
          <h2 className="section-title">How Reach For The Stars works</h2>
          <p className="section-subtitle">
            Personalized audios scheduled each night - intro relaxation music, goal recordings, and optional
            second plays while you sleep.
          </p>
        </div>
        <div className="grid grid-3">
          {content.nightlySteps.map((step, index) => (
            <div key={step.title} className="card">
              <h3>
                {index + 1}. {step.title}
              </h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 16, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          Learn more on our <a href="/science">Science</a> page or read{" "}
          <a href="/faqs">FAQs</a>.
        </p>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="eyebrow">Other goals</span>
            <h2 className="section-title">Explore more focus areas</h2>
          </div>
          <div className="grid grid-3">
            {related.map((page) => (
              <a
                key={page.slug}
                href={page.path}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <h3 style={{ marginTop: 0 }}>{page.label}</h3>
                <p style={{ marginBottom: 0, color: "#64748b", fontSize: 14 }}>{page.tagline}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {showSignupCta && (
        <section className="section">
          <div className="card glow" style={{ textAlign: "center", padding: 28 }}>
            <h2 style={{ marginTop: 0 }}>Ready to start?</h2>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              Set {content.label.toLowerCase()} among your goals tonight. Your personalized audios
              begin the first night you press Start Session.
            </p>
            <AffiliateSignupLink fallbackHref={signupHref} />
          </div>
        </section>
      )}

      <SiteFooter showStartJourney={false} />
    </main>
  );
}
