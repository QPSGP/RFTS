import type { Metadata } from "next";
import BlogExploreNav from "@/components/BlogExploreNav";
import SiteFooter from "@/components/SiteFooter";
import { getTopicLandingPage } from "@/lib/topic-landing-pages";
import { resolveBlogPostsNewestFirst } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wellness Blog - Sleep, Stress, Pain & Memory | Reach For The Stars",
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

export default async function BlogPage() {
  const posts = await resolveBlogPostsNewestFirst();

  return (
    <main>
      <section className="hero section">
        <div className="blog-hero-top">
          <BlogExploreNav />
        </div>
        <span className="pill">Blog</span>
        <h1>Wellness articles &amp; session excerpts</h1>
        <p>
          Practical guides on sleep, stress relief, pain comfort, memory, and burnout - with
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

      <SiteFooter />
    </main>
  );
}
