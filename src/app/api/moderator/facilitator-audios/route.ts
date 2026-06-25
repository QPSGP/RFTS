import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createLibraryItem,
  getLibraryItemIdBySkuCode,
  listFacilitatorLibraryItems
} from "@/lib/db";
import { requireActiveModerator } from "@/lib/moderator-member-access";
import { recordModeratorStaffActivity } from "@/lib/facilitator-staff-activity";
import { stripSkuHyphens } from "@/lib/sku-code";

const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  audioUrl: z.string().url(),
  coverUrl: z.string().optional().default(""),
  skuCode: z.string().optional().default(""),
  memberEmails: z.array(z.string().email()).optional()
});

export async function GET() {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const items = await listFacilitatorLibraryItems(moderator.id);
  return NextResponse.json({
    audios: items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      skuCode: item.skuCode ?? "",
      audioUrl: item.audioUrl,
      coverUrl: item.coverUrl,
      allowedUserEmails: item.allowedUserEmails ?? [],
      inGeneralCatalog: item.inGeneralCatalog ?? true,
      createdAt: item.createdAt
    }))
  });
}

export async function POST(request: Request) {
  const moderator = await requireActiveModerator();
  if ("error" in moderator) {
    return NextResponse.json({ error: moderator.error }, { status: moderator.status });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors?.[0] ||
      parsed.error.errors?.[0]?.message ||
      "Invalid input.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const assigned = moderator.assignedUserEmails.map((e) => e.trim().toLowerCase());
  if (assigned.length === 0) {
    return NextResponse.json(
      { error: "No members are assigned to you yet. Ask admin to assign members first." },
      { status: 400 }
    );
  }

  let memberEmails = parsed.data.memberEmails?.map((e) => e.trim().toLowerCase()) ?? assigned;
  const invalid = memberEmails.filter((e) => !assigned.includes(e));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `These emails are not your assigned members: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }
  if (memberEmails.length === 0) {
    return NextResponse.json({ error: "Select at least one assigned member." }, { status: 400 });
  }

  const sku = stripSkuHyphens(parsed.data.skuCode || "");
  if (sku) {
    const existingId = await getLibraryItemIdBySkuCode(sku);
    if (existingId) {
      return NextResponse.json(
        { error: "A library item with this SKU already exists." },
        { status: 409 }
      );
    }
  }

  const record = await createLibraryItem({
    title: parsed.data.title,
    description: parsed.data.description,
    skuCode: sku,
    categories: ["Facilitator"],
    coverUrl: parsed.data.coverUrl || "",
    audioUrl: parsed.data.audioUrl,
    interestIds: [],
    allowedUserEmails: memberEmails,
    isAdult: false,
    moderatorId: moderator.id,
    inGeneralCatalog: false
  });

  await recordModeratorStaffActivity(`uploaded_member_audio:${record.title}`);

  return NextResponse.json({ ok: true, record });
}
