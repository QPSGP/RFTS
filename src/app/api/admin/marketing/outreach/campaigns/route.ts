import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionEmail, isAdminSession } from "@/lib/auth";
import {
  approveCampaignRecipients,
  createCampaignsFromSelection,
  listCampaignSummaries,
  sendCampaignRecipients,
  updateCampaignRecipientCopy
} from "@/lib/outreach-campaigns";
import {
  getOutreachCampaign,
  listOutreachCampaignRecipients,
  updateOutreachCampaign
} from "@/lib/outreach-campaigns-db";

const createSchema = z.object({
  name: z.string().trim().max(200).optional(),
  templateName: z.string().trim().max(200).optional(),
  templateId: z.string().uuid().optional(),
  contactIds: z.array(z.string().uuid()).max(200).optional(),
  query: z
    .object({
      q: z.string().optional().nullable(),
      status: z.string().optional().nullable(),
      persona: z.string().optional().nullable(),
      category: z.string().optional().nullable(),
      interest: z.string().optional().nullable(),
      entryPath: z.string().optional().nullable(),
      targetType: z.string().optional().nullable(),
      doNotEmail: z.boolean().optional().nullable(),
      hasEmail: z.boolean().optional().nullable(),
      tag: z.string().optional().nullable()
    })
    .optional()
});

const patchSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().trim().max(200).optional(),
  cancel: z.boolean().optional(),
  approveAll: z.boolean().optional(),
  approveRecipientId: z.string().uuid().optional(),
  sendAll: z.boolean().optional(),
  sendRecipientId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  subject: z.string().max(500).optional(),
  bodyText: z.string().max(20000).optional()
});

export async function GET(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    try {
      const campaign = await getOutreachCampaign(id);
      if (!campaign) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      const recipients = await listOutreachCampaignRecipients(id);
      const res = NextResponse.json({ campaign, recipients });
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      return res;
    } catch (err) {
      console.error("[GET /api/admin/marketing/outreach/campaigns?id]", err);
      return NextResponse.json({ error: "Could not load campaign." }, { status: 500 });
    }
  }
  try {
    const campaigns = await listCampaignSummaries();
    const res = NextResponse.json({ campaigns });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (err) {
    console.error("[GET /api/admin/marketing/outreach/campaigns]", err);
    return NextResponse.json({ error: "Could not load campaigns." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  if (!parsed.data.contactIds?.length && parsed.data.query == null) {
    return NextResponse.json(
      { error: "Select contacts or apply a query, then set up drafts." },
      { status: 400 }
    );
  }
  const result = await createCampaignsFromSelection({
    ...parsed.data,
    createdByEmail: getSessionEmail()
  });
  const campaigns = await listCampaignSummaries();
  return NextResponse.json({
    ok: true,
    created: result.campaigns.map((c) => ({
      id: c.campaign.id,
      name: c.campaign.name,
      recipients: c.recipients.length,
      templateName: c.campaign.templateName
    })),
    skipped: result.skipped.length,
    needsTemplate: result.needsTemplate,
    campaigns
  });
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const by = getSessionEmail();
  const campaign = await getOutreachCampaign(parsed.data.campaignId);
  if (!campaign) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (parsed.data.cancel) {
    await updateOutreachCampaign(campaign.id, { status: "cancelled" });
    const campaigns = await listCampaignSummaries();
    const recipients = await listOutreachCampaignRecipients(campaign.id);
    return NextResponse.json({ ok: true, campaigns, recipients });
  }
  if (parsed.data.recipientId && (parsed.data.subject != null || parsed.data.bodyText != null)) {
    const result = await updateCampaignRecipientCopy({
      campaignId: campaign.id,
      recipientId: parsed.data.recipientId,
      subject: parsed.data.subject,
      bodyText: parsed.data.bodyText
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const campaigns = await listCampaignSummaries();
    const recipients = await listOutreachCampaignRecipients(campaign.id);
    return NextResponse.json({ ok: true, campaigns, recipients });
  }
  if (parsed.data.name) {
    await updateOutreachCampaign(campaign.id, { name: parsed.data.name });
  }
  if (parsed.data.approveAll || parsed.data.approveRecipientId) {
    const result = await approveCampaignRecipients({
      campaignId: campaign.id,
      recipientId: parsed.data.approveRecipientId ?? null,
      createdByEmail: by
    });
    const campaigns = await listCampaignSummaries();
    const recipients = await listOutreachCampaignRecipients(campaign.id);
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      campaign: result.campaign,
      recipients,
      campaigns
    });
  }
  if (parsed.data.sendAll || parsed.data.sendRecipientId) {
    const result = await sendCampaignRecipients({
      campaignId: campaign.id,
      recipientId: parsed.data.sendRecipientId ?? null,
      createdByEmail: by
    });
    const campaigns = await listCampaignSummaries();
    const recipients = await listOutreachCampaignRecipients(campaign.id);
    return NextResponse.json({
      ok: result.errors.length === 0,
      sent: result.sent,
      skipped: result.skipped,
      errors: result.errors,
      recipients,
      campaigns
    });
  }

  const campaigns = await listCampaignSummaries();
  return NextResponse.json({ ok: true, campaigns });
}
