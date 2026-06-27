 "use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminContent from "@/components/AdminContent";
import AdminSubscriptions from "@/components/AdminSubscriptions";
import AdminPlaybackSettings from "@/components/AdminPlaybackSettings";
import AdminModerators from "@/components/AdminModerators";
import AdminUsers from "@/components/AdminUsers";
import AdminAdmins from "@/components/AdminAdmins";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import AffiliateAdmin from "@/components/AffiliateAdmin";
import AffiliatePayoutAdmin from "@/components/AffiliatePayoutAdmin";
import ScheduleAlgorithmTool from "@/components/ScheduleAlgorithmTool";
import AdminSitePages from "@/components/AdminSitePages";
import { adminSectionToggleClass } from "@/components/admin-section-toggle";

const contentConsoleSections = {
  members: false,
  moderators: false,
  affiliates: false,
  playback: false,
  subscriptions: false,
  goals: false,
  library: false,
  sitePages: false,
  admins: false,
  scheduleAlgorithm: false
} as const;

type ContentConsoleSection = keyof typeof contentConsoleSections;

export default function AdminContentPage() {
  const [isFirstAdmin, setIsFirstAdmin] = useState<boolean | null>(null);
  const [openSections, setOpenSections] = useState(contentConsoleSections);

  useEffect(() => {
    fetch("/api/admin/is-first-admin")
      .then((res) => res.json())
      .then((data) => setIsFirstAdmin(Boolean(data.isFirstAdmin)))
      .catch(() => setIsFirstAdmin(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewed_content_console" }),
      credentials: "include"
    }).catch(() => {});
  }, []);

  const toggleSection = (key: ContentConsoleSection, id: string) => {
    setOpenSections((prev) => {
      const nextOpen = !prev[key];
      if (nextOpen) {
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return { ...contentConsoleSections, [key]: true };
      }
      return { ...prev, [key]: false };
    });
  };

  return (
    <main>
      <section style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Admin Content Console</h1>
          <p>Manage goals, audio library items, and ordering.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin/dashboard" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Activity Dashboard
          </Link>
          <Link href="/admin/member-issues" className="button button-secondary" style={{ padding: "8px 12px", fontSize: 13 }}>
            Member issue reports
          </Link>
          <AdminLogoutButton />
        </div>
      </section>
      <section style={{ marginBottom: 24 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <button
            className={adminSectionToggleClass(openSections.members, true)}
            type="button"
            aria-expanded={openSections.members}
            onClick={() => toggleSection("members", "admin-members")}
          >
            Members Section
          </button>
          <button
            className={adminSectionToggleClass(openSections.moderators, true)}
            type="button"
            aria-expanded={openSections.moderators}
            onClick={() => toggleSection("moderators", "admin-moderators")}
          >
            Facilitators Section
          </button>
          <button
            className={adminSectionToggleClass(openSections.affiliates, true)}
            type="button"
            aria-expanded={openSections.affiliates}
            onClick={() => toggleSection("affiliates", "admin-affiliates")}
          >
            Affiliate Section
          </button>
          <button
            className={adminSectionToggleClass(openSections.playback, true)}
            type="button"
            aria-expanded={openSections.playback}
            onClick={() => toggleSection("playback", "admin-playback")}
          >
            Playback schedule settings
          </button>
          <button
            className={adminSectionToggleClass(openSections.subscriptions, true)}
            type="button"
            aria-expanded={openSections.subscriptions}
            onClick={() => toggleSection("subscriptions", "admin-subscriptions")}
          >
            Subscription Plans Section
          </button>
          <button
            className={adminSectionToggleClass(openSections.goals, true)}
            type="button"
            aria-expanded={openSections.goals}
            onClick={() => toggleSection("goals", "admin-goals")}
          >
            Goals Section
          </button>
          <button
            className={adminSectionToggleClass(openSections.library, true)}
            type="button"
            aria-expanded={openSections.library}
            onClick={() => toggleSection("library", "admin-audio-library")}
          >
            Audio Library Section (facilitator private / all)
          </button>
          <button
            className={adminSectionToggleClass(openSections.sitePages, true)}
            type="button"
            aria-expanded={openSections.sitePages}
            onClick={() => toggleSection("sitePages", "admin-site-pages")}
          >
            Site &amp; landing pages
          </button>
          <button
            className={adminSectionToggleClass(openSections.scheduleAlgorithm, true)}
            type="button"
            aria-expanded={openSections.scheduleAlgorithm}
            onClick={() => toggleSection("scheduleAlgorithm", "admin-schedule-algorithm")}
          >
            Schedule algorithm (member)
          </button>
          {isFirstAdmin && (
            <button
              className={adminSectionToggleClass(openSections.admins, true)}
              type="button"
              aria-expanded={openSections.admins}
              onClick={() => toggleSection("admins", "admin-admins")}
            >
              Administrators Section
            </button>
          )}
        </div>
      </section>
      {openSections.members && (
        <section id="admin-members" style={{ marginBottom: 20 }}>
          <AdminUsers />
        </section>
      )}
      {openSections.moderators && (
        <section id="admin-moderators" style={{ marginBottom: 20 }}>
          <AdminModerators />
        </section>
      )}
      {openSections.affiliates && (
        <section id="admin-affiliates" style={{ marginBottom: 20 }}>
          <AffiliatePayoutAdmin />
          <AffiliateAdmin />
        </section>
      )}
      {openSections.playback && (
        <section id="admin-playback" style={{ marginBottom: 20 }}>
          <AdminPlaybackSettings />
        </section>
      )}
      {openSections.subscriptions && (
        <section id="admin-subscriptions" style={{ marginBottom: 20 }}>
          <AdminSubscriptions />
        </section>
      )}
      {openSections.scheduleAlgorithm && (
        <section id="admin-schedule-algorithm" style={{ marginBottom: 20 }}>
          <ScheduleAlgorithmTool
            onClose={() =>
              setOpenSections((prev) => ({ ...prev, scheduleAlgorithm: false }))
            }
          />
        </section>
      )}
      {openSections.sitePages && (
        <section id="admin-site-pages" style={{ marginBottom: 20 }}>
          <AdminSitePages />
        </section>
      )}
      {isFirstAdmin && openSections.admins && (
        <section style={{ marginBottom: 20 }}>
          <AdminAdmins />
        </section>
      )}
      <AdminContent
        openGoals={openSections.goals}
        openLibrary={openSections.library}
        isFirstAdmin={isFirstAdmin}
      />
    </main>
  );
}
