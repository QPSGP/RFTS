import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";
import { findRelatedAudioLandingsForBlogPost } from "@/lib/audio-landing-relations";
import { getBlogPostsNewestFirst } from "@/lib/blog-posts";
import { listLibrary } from "@/lib/db";
import { buildMarketingSignupHref } from "@/lib/marketing-signup";
import { resolveBlogPost } from "@/lib/site-copy";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string }; searchParams?: { ref?: string } };

export function generateStaticParams() {
  return getBlogPostsNewestFirst().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await resolveBlogPost(params.slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt
    }
  };
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const post = await resolveBlogPost(params.slug);
  if (!post) notFound();
  const library = await listLibrary();
  const relatedAudios = findRelatedAudioLandingsForBlogPost(library, {
    topicSlug: post.topicSlug,
    goalSlug: post.goalSlug
  });
  const signupHref = buildMarketingSignupHref(searchParams?.ref);
  return <BlogPostView post={post} relatedAudios={relatedAudios} signupHref={signupHref} />;
}
