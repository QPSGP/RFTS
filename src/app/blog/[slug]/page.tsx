import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";
import { findRelatedAudioLandingsForBlogPost } from "@/lib/audio-landing-relations";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";
import { listLibrary } from "@/lib/db";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getBlogPost(params.slug);
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

export default async function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();
  const library = await listLibrary();
  const relatedAudios = findRelatedAudioLandingsForBlogPost(library, {
    topicSlug: post.topicSlug,
    goalSlug: post.goalSlug
  });
  return <BlogPostView post={post} relatedAudios={relatedAudios} />;
}
