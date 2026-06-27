import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import { getBlogPostsNewestFirst } from "@/lib/blog-posts";
import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";
import { getTopicLandingPage, TOPIC_LANDING_PAGES } from "@/lib/topic-landing-pages";

export const metadata: Metadata = {
  title: "Wellness Blog — Sleep, Stress, Pain & Memory | Reach For The Stars",
  description:
    "Articles and guided-audio transcript excerpts on sleep meditation, stress relief, pain comfort, memory, and burnout recovery.",
  openGraph: {
    title: "Reach For The Stars Wellness Blog",
    description:
      "Articles and transcript excerpts on sleep, stress relief, pain relief, memory, and nightly guided audios."
  }
};

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

export default function BlogPage() {
  const posts = getBlogPostsNewestFirst();

  return (
    <main>
      <section className="hero section">
        <span className="pill">Blog</span>
        <h1>Wellness articles &amp; session excerpts</h1>
        <p>
          Practical guides on sleep, stress relief, pain comfort, memory, and burnout — with
          transcript excerpts from guided audios. Each article links to our wellness topic pages
          when relevant.
        </p>
      </section>

      <section className="section">
        <div className="stack" style={{ gap: 16 }}>
          {posts.map((post) => {
            const topic = post.topicSlug ? getTopicLandingPage(post.topicSlug) : null;
            return (
              <a
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px" }}>
                  {formatDate(post.publishedAt)} · {post.readMinutes} min
                  {topic ? ` · ${topic.pill}` : ""}
                </p>
                <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{post.title}</h2>
                <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>{post.excerpt}</p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Wellness</span>
          <h2 className="section-title">Wellness topic pages</h2>
        </div>
        <p style={{ color: "#64748b", marginBottom: 16 }}>
          SEO-focused guides on sleep, stress relief, pain comfort, and memory — each with related
          blog articles.
        </p>
        <div className="grid grid-3">
          {TOPIC_LANDING_PAGES.map((page) => (
            <a
              key={page.slug}
              href={page.path}
              className="card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {page.pill}
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Goals</span>
          <h2 className="section-title">Goal landing pages</h2>
        </div>
        <p style={{ color: "#64748b", marginBottom: 16 }}>
          Explore the same focus areas as our homepage — health, wealth, relationships, memory,
          inspiration, and spirituality.
        </p>
        <div className="grid grid-3">
          {GOAL_LANDING_PAGES.map((page) => (
            <a
              key={page.slug}
              href={page.path}
              className="card"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              {page.label}
            </a>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
