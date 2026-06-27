import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostView from "@/components/BlogPostView";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-posts";

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

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();
  return <BlogPostView post={post} />;
}
