import BlogExploreNav from "@/components/BlogExploreNav";
import AffiliateSignupLink from "@/components/AffiliateSignupLink";
import RelatedAudioLandings from "@/components/RelatedAudioLandings";
import SiteFooter from "@/components/SiteFooter";
import { GOAL_SIGNUP_HREF, getGoalLandingPage } from "@/lib/goal-landing-pages";
import { isMemberLoggedIn } from "@/lib/member-session";
import { getTopicLandingPage } from "@/lib/topic-landing-pages";
import type { AudioLandingCard } from "@/lib/audio-landing-relations";
import type { BlogPost } from "@/lib/blog-posts";

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default async function BlogPostView({
  post,
  relatedAudios = [],
  signupHref = GOAL_SIGNUP_HREF
}: {
  post: BlogPost;
  relatedAudios?: AudioLandingCard[];
  signupHref?: string;
}) {
  const showSignupCta = !(await isMemberLoggedIn());
  const topicPage = post.topicSlug ? getTopicLandingPage(post.topicSlug) : null;
  const goalPage = post.goalSlug ? getGoalLandingPage(post.goalSlug) : null;

  return (
    <main>
      <article>
        <section className="hero section">
          <div className="blog-hero-top">
            <BlogExploreNav />
          </div>
          <span className="pill">Blog</span>
          <h1>{post.title}</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>
            {formatDate(post.publishedAt)} · {post.readMinutes} min read
          </p>
          <p>{post.excerpt}</p>
        </section>

        <section className="section">
          {post.sections.map((section, index) => (
            <div key={index} style={{ marginBottom: 24 }}>
              {section.heading && <h2 className="section-title">{section.heading}</h2>}
              {section.paragraphs.map((paragraph, pIndex) => (
                <p key={pIndex} style={{ lineHeight: 1.7, color: "#374151" }}>
                  {paragraph}
                </p>
              ))}
            </div>
          ))}

          <div
            className="card"
            style={{
              marginTop: 8,
              marginBottom: 24,
              background: "#f8fafc",
              borderLeft: "4px solid #10b981"
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginTop: 0 }}>
              Transcript excerpt · {post.transcriptExcerpt.sessionTitle}
            </p>
            <p
              style={{
                fontStyle: "italic",
                lineHeight: 1.7,
                marginBottom: 0,
                color: "#334155"
              }}
            >
              &ldquo;{post.transcriptExcerpt.quote}&rdquo;
            </p>
          </div>

          {goalPage && (
            <p style={{ marginBottom: 16 }}>
              Related goal:{" "}
              <a href={goalPage.path}>{goalPage.title}</a>
            </p>
          )}

          {topicPage && (
            <p style={{ marginBottom: 16 }}>
              Related:{" "}
              <a href={topicPage.path}>{topicPage.title}</a>
            </p>
          )}

          <RelatedAudioLandings
            heading={
              topicPage
                ? `Related audios for ${topicPage.pill.toLowerCase()}`
                : goalPage
                  ? `Related audios for ${goalPage.label.toLowerCase()}`
                  : "Related library audios"
            }
            audios={relatedAudios}
          />

          {showSignupCta && (
            <div className="card glow" style={{ textAlign: "center", padding: 24 }}>
              <h2 style={{ marginTop: 0, fontSize: 20 }}>Try personalized nightly audios</h2>
              <p style={{ color: "#64748b", marginBottom: 16 }}>
                Set your goals, press Start Session at bedtime, and let Reach For The Stars handle
                the schedule.
              </p>
              <AffiliateSignupLink fallbackHref={signupHref} />
            </div>
          )}
        </section>
      </article>

      <section className="section" style={{ paddingTop: 0 }}>
        <a className="button button-secondary" href="/blog">
          ← All articles
        </a>
      </section>

      <SiteFooter showStartJourney={false} />
    </main>
  );
}
