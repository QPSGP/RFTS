 "use client";

import { useState } from "react";
import AdminContent from "@/components/AdminContent";
import AdminSubscriptions from "@/components/AdminSubscriptions";
import AdminPlaybackSettings from "@/components/AdminPlaybackSettings";
import AdminModerators from "@/components/AdminModerators";
import ModerationQueue from "@/components/ModerationQueue";
import AdminUsers from "@/components/AdminUsers";
import AffiliateAdmin from "@/components/AffiliateAdmin";

export default function AdminContentPage() {
  const [openSections, setOpenSections] = useState({
    members: false,
    moderators: false,
    affiliates: false,
    playback: false,
    subscriptions: false,
    goals: false,
    library: false
  });

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
            Moderators Section
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
      <AdminContent
        openGoals={openSections.goals}
        openLibrary={openSections.library}
      />
    </main>
  );
}
