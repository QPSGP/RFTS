import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  findDefaultByPath,
  listSiteCopyCatalog,
  resetSiteCopy,
  saveSiteCopy,
  applyBlogCopyOverlay,
  applyGoalCopyOverlay,
  applyTopicCopyOverlay,
  blogEditableFields,
  goalEditableFields,
  topicEditableFields,
  type BlogCopyOverlay,
  type GoalCopyOverlay,
  type TopicCopyOverlay
} from "@/lib/site-copy";
import { getSiteCopyOverride } from "@/lib/db";
import type { BlogPost } from "@/lib/blog-posts";
import type { GoalLandingContent } from "@/lib/goal-landing-pages";
import type { TopicLandingContent } from "@/lib/topic-landing-pages";

const titledBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000)
});

const goalCopySchema = z.object({
  label: z.string().trim().min(1).max(80),
  tagline: z.string().trim().min(1).max(400),
  title: z.string().trim().min(1).max(220),
  metaTitle: z.string().trim().min(1).max(160),
  metaDescription: z.string().trim().min(1).max(400),
  heroLead: z.string().trim().min(1).max(2000),
  eyebrow: z.string().trim().min(1).max(80),
  sectionTitle: z.string().trim().min(1).max(200),
  sectionSubtitle: z.string().trim().min(1).max(600),
  howItHelps: z.array(titledBodySchema).min(1).max(8),
  nightlySteps: z.array(titledBodySchema).min(1).max(8)
});

const topicCopySchema = z.object({
  pill: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(220),
  metaTitle: z.string().trim().min(1).max(160),
  metaDescription: z.string().trim().min(1).max(400),
  heroLead: z.string().trim().min(1).max(2000),
  eyebrow: z.string().trim().min(1).max(80),
  sectionTitle: z.string().trim().min(1).max(200),
  sectionSubtitle: z.string().trim().min(1).max(600),
  howItHelps: z.array(titledBodySchema).min(1).max(8),
  nightlySteps: z.array(titledBodySchema).min(1).max(8)
});

const blogCopySchema = z.object({
  title: z.string().trim().min(1).max(300),
  metaTitle: z.string().trim().min(1).max(160),
  metaDescription: z.string().trim().min(1).max(400),
  excerpt: z.string().trim().min(1).max(800),
  readMinutes: z.number().int().min(1).max(60),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().max(200).optional(),
        paragraphs: z.array(z.string().trim().min(1).max(4000)).min(1).max(12)
      })
    )
    .min(1)
    .max(12),
  transcriptExcerpt: z.object({
    sessionTitle: z.string().trim().min(1).max(200),
    quote: z.string().trim().min(1).max(2000)
  })
});

function revalidateCopyPath(path: string, kind: "goal" | "topic" | "blog") {
  revalidatePath(path);
  if (kind === "blog") {
    revalidatePath("/blog");
  }
}

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const path = url.searchParams.get("path")?.trim() || "";
  if (!path) {
    const pages = await listSiteCopyCatalog();
    const res = NextResponse.json({ pages });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  }
  const found = findDefaultByPath(path);
  if (!found) {
    return NextResponse.json({ error: "Unknown page." }, { status: 404 });
  }
  let overlay: Record<string, unknown> = {};
  let updatedAt: string | undefined;
  let updatedBy: string | null = null;
  try {
    const row = await getSiteCopyOverride(path);
    if (row) {
      overlay = row.content;
      updatedAt = row.updatedAt;
      updatedBy = row.updatedBy;
    }
  } catch {
    overlay = {};
  }
  let current: unknown;
  let defaults: unknown;
  if (found.kind === "goal") {
    const page = found.defaults as GoalLandingContent;
    defaults = goalEditableFields(page);
    current = goalEditableFields(applyGoalCopyOverlay(page, overlay as GoalCopyOverlay));
  } else if (found.kind === "topic") {
    const page = found.defaults as TopicLandingContent;
    defaults = topicEditableFields(page);
    current = topicEditableFields(applyTopicCopyOverlay(page, overlay as TopicCopyOverlay));
  } else {
    const post = found.defaults as BlogPost;
    defaults = blogEditableFields(post);
    current = blogEditableFields(applyBlogCopyOverlay(post, overlay as BlogCopyOverlay));
  }
  const res = NextResponse.json({
    path,
    kind: found.kind,
    slug: found.slug,
    label: found.label,
    defaults,
    current,
    customized: Object.keys(overlay).length > 0,
    updatedAt,
    updatedBy
  });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

export async function PUT(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const found = findDefaultByPath(path);
  if (!found) {
    return NextResponse.json({ error: "Unknown page." }, { status: 404 });
  }
  const schema =
    found.kind === "goal" ? goalCopySchema : found.kind === "topic" ? topicCopySchema : blogCopySchema;
  const parsed = schema.safeParse(body.content);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid copy. Check required fields." }, { status: 400 });
  }
  try {
    const result = await saveSiteCopy(path, parsed.data, getSessionEmail());
    revalidateCopyPath(path, found.kind);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save copy." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const path = url.searchParams.get("path")?.trim() || "";
  const found = findDefaultByPath(path);
  if (!found) {
    return NextResponse.json({ error: "Unknown page." }, { status: 404 });
  }
  try {
    await resetSiteCopy(path);
    revalidateCopyPath(path, found.kind);
    return NextResponse.json({ ok: true, customized: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reset copy." },
      { status: 500 }
    );
  }
}
