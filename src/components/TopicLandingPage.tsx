import SiteFooter from "@/components/SiteFooter";
import { getBlogPostsNewestFirst } from "@/lib/blog-posts";
import {
  getRelatedTopicPages,
  TOPIC_SIGNUP_HREF,
  type TopicLandingContent
} from "@/lib/topic-landing-pages";

export default function TopicLandingPage({ content }: { content: TopicLandingContent }) {
  const related = getRelatedTopicPages(content.relatedSlugs);
  const relatedArticles = getBlogPostsNewestFirst().filter(
    (post) => post.topicSlug === content.slug
  );

  return (
    <main>
      <section className="hero section">
        <span className="pill">{content.pill}</span>
        <h1>{content.title}</h1>
        <p>{content.heroLead}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          <a className="button" href={TOPIC_SIGNUP_HREF}>Start your journey</a>
          <a className="button button-secondary" href="/how-it-works">How it works</a>
        </div>
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

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Nightly program</span>
          <h2 className="section-title">How Reach For The Stars works</h2>
          <p className="section-subtitle">
            Personalized audios scheduled each night — preparation, goal recordings, and optional
            second plays while you sleep.
          </p>
        </div>
        <div className="grid grid-3">
          {content.nightlySteps.map((step, index) => (
            <div key={step.title} className="card">
              <h3>{index + 1}. {step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
        <p style={{ marginTop: 16, color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          Learn more about the science behind sleep, suggestion, and repetition on our{" "}
          <a href="/science">Science</a> page, or read member-focused answers on{" "}
          <a href="/faqs">FAQs</a>.
        </p>
      </section>

      {relatedArticles.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="eyebrow">Articles</span>
            <h2 className="section-title">Related reading</h2>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {relatedArticles.map((post) => (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{post.title}</h3>
                <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{post.excerpt}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <div className="section-head">
            <span className="eyebrow">Related topics</span>
            <h2 className="section-title">Other wellness focus areas</h2>
          </div>
          <div className="grid grid-3">
            {related.map((page) => (
              <a
                key={page.slug}
                href={page.path}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <h3 style={{ marginTop: 0 }}>{page.pill}</h3>
                <p style={{ marginBottom: 0, color: "#64748b", fontSize: 14 }}>{page.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="card glow" style={{ textAlign: "center", padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>Ready to start?</h2>
          <p style={{ color: "#64748b", marginBottom: 16 }}>
            Choose your membership and set goals tonight. Your personalized audios begin the first
            night you press Start Session.
          </p>
          <a className="button" href={TOPIC_SIGNUP_HREF}>Start your journey</a>
        </div>
      </section>

      <SiteFooter showStartJourney={false} />
    </main>
  );
}
