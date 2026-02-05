 "use client";

import { useEffect, useState } from "react";
import AdminContent from "@/components/AdminContent";
import AdminSubscriptions from "@/components/AdminSubscriptions";
import AdminPlaybackSettings from "@/components/AdminPlaybackSettings";
import AdminModerators from "@/components/AdminModerators";
import ModerationQueue from "@/components/ModerationQueue";
import AdminUsers from "@/components/AdminUsers";
import AdminAdmins from "@/components/AdminAdmins";
import AffiliateAdmin from "@/components/AffiliateAdmin";

export default function AdminContentPage() {
  const [isFirstAdmin, setIsFirstAdmin] = useState<boolean | null>(null);
  const [openSections, setOpenSections] = useState({
    members: false,
    moderators: false,
    affiliates: false,
    playback: false,
    subscriptions: false,
    goals: false,
    library: false,
    admins: false
  });

  useEffect(() => {
    fetch("/api/admin/is-first-admin")
      .then((res) => res.json())
      .then((data) => setIsFirstAdmin(Boolean(data.isFirstAdmin)))
      .catch(() => setIsFirstAdmin(false));
  }, []);

  const toggleSection = (key: keyof typeof openSections, id: string) => {
    setOpenSections((prev) => {
      const nextOpen = !prev[key];
      if (nextOpen) {
        requestAnimationFrame(() => {
          const el = document.getElementById(id);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      return { ...prev, [key]: nextOpen };
    });
  };

  return (
    <main>
      <section style={{ marginBottom: 24 }}>
        <h1>Admin Content Console</h1>
        <p>Manage goals, audio library items, and ordering.</p>
      </section>
      <section style={{ marginBottom: 24 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("members", "admin-members")}
          >
            Members Section
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("moderators", "admin-moderators")}
          >
            Co-Creators Section
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("affiliates", "admin-affiliates")}
          >
            Affiliate Section
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("playback", "admin-playback")}
          >
            Playback Schedule Section
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("subscriptions", "admin-subscriptions")}
          >
            Subscription Plans Section
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("goals", "admin-goals")}
          >
            Goals Section
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => toggleSection("library", "admin-audio-library")}
          >
            Audio Library Section
          </button>
          {isFirstAdmin && (
            <button
              className="button button-secondary"
              type="button"
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
          <ModerationQueue />
        </section>
      )}
      {openSections.affiliates && (
        <section id="admin-affiliates" style={{ marginBottom: 20 }}>
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
