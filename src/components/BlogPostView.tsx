import BlogExploreNav from "@/components/BlogExploreNav";
import SiteFooter from "@/components/SiteFooter";
import { GOAL_SIGNUP_HREF } from "@/lib/goal-landing-pages";
import { getTopicLandingPage } from "@/lib/topic-landing-pages";
import type { BlogPost } from "@/lib/blog-posts";

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default function BlogPostView({ post }: { post: BlogPost }) {
  const topicPage = post.topicSlug ? getTopicLandingPage(post.topicSlug) : null;

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

          {topicPage && (
            <p style={{ marginBottom: 16 }}>
              Related:{" "}
              <a href={topicPage.path}>{topicPage.title}</a>
            </p>
          )}

          <div className="card glow" style={{ textAlign: "center", padding: 24 }}>
            <h2 style={{ marginTop: 0, fontSize: 20 }}>Try personalized nightly audios</h2>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              Set your goals, press Start Session at bedtime, and let Reach For The Stars handle
              the schedule.
            </p>
            <a className="button" href={GOAL_SIGNUP_HREF}>
              Start your journey
            </a>
          </div>
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
