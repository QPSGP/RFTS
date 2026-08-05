"use client";

import { useState } from "react";
import SiteFooter from "@/components/SiteFooter";

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function FacilitatorPage() {
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      focusAreas: formData.get("focusAreas"),
      experience: formData.get("experience"),
      links: formData.get("links"),
      phone: formData.get("phone"),
      website: formData.get("website"),
      socialLinks: formData.get("socialLinks"),
      photoUrl: formData.get("photoUrl")
    };
    const response = await fetch("/api/moderators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      event.currentTarget.reset();
      setStatus("Thanks! Your application has been received.");
      return;
    }
    const data = await response.json().catch(() => ({}));
    setStatus(data?.error || "Something went wrong. Please review your responses and try again.");
  };

  return (
    <main>
      <section className="hero section">
        <span className="pill">Facilitator Program</span>
        <h1>Add more value for your Clients by using the Reach for the Stars System.</h1>
        <p>
          Facilitators are practitioners who use Reach For The Stars with their clients-whether
          by referring them to the platform or by actively managing their journey. You get
          access to our audio library, the ability to add your own recordings for your clients,
          and ongoing affiliate benefits for everyone you bring in. When you manage a client,
          you earn an additional 25% on top of your affiliate share-and if you later step
          back from managing, you keep the affiliate 25% for as long as they stay.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">How It Works</span>
          <h2 className="section-title">Refer, manage, or both.</h2>
          <p className="section-subtitle">
            Your relationship with your clients and with RFTS is flexible and lasting.
          </p>
        </div>
        <div className="grid grid-3 section">
          <div className="card">
            <h3>Refer Only</h3>
            <p>
              If you simply refer clients to Reach For The Stars, you are an affiliate:
              you earn 25% ongoing for every referred member who stays subscribed. No
              management required-your referral link does the work.
            </p>
          </div>
          <div className="card">
            <h3>Manage Clients</h3>
            <p>
              When you manage clients on the platform, you are both facilitator and
              affiliate. You curate their experience using our library, add your own
              audios for them, and earn your affiliate 25% plus an additional 25% for
              managing them-so you are rewarded for both bringing them in and guiding
              their journey.
            </p>
          </div>
          <div className="card">
            <h3>If You Step Back</h3>
            <p>
              If you stop managing clients, you remain an affiliate for everyone you
              referred. Your ongoing 25% share continues for as long as those members
              stay-so your initial work keeps supporting your practice and your income.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">What You Get</span>
          <h2 className="section-title">Tools that support your practice.</h2>
        </div>
        <div className="grid grid-2 section">
          <div className="card">
            <h3>Our Audio Library</h3>
            <p>
              Use the full Reach For The Stars library-goal-based sessions, sleep and
              recovery tracks, and vetted content-as the foundation for your clients&apos;
              experience.
            </p>
          </div>
          <div className="card">
            <h3>Your Own Audios for Your Clients</h3>
            <p>
              Add personalized or custom recordings for the clients you manage. Your
              voice, your methods, integrated into their journey alongside our library-so
              they get one cohesive, professional experience.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h3>Why Become a Facilitator</h3>
          <div className="stack">
            <p>Extend your reach with a platform built for transformation and growth.</p>
            <p>Earn 25% ongoing on every member you refer; add an extra 25% when you manage them.</p>
            <p>Keep earning even if you stop managing-your affiliate 25% stays for those you brought in.</p>
            <p>Strengthen client outcomes with our library plus your own content.</p>
          </div>
        </div>
        <div className="card">
          <h3>Who It&apos;s For</h3>
          <p>
            Coaches, hypnotherapists, wellness practitioners, and therapists who want to
            offer guided audio as part of their practice-with a simple referral path, full
            management options, and lasting affiliate rewards.
          </p>
        </div>
      </section>

      <section className="card section">
        <h2>Featured Facilitator</h2>
        <p style={{ color: "#475569" }}>
          Learn more about our founder, first facilitator and her contribution to the
          Reach For The Stars experience.
        </p>
        <a className="button button-secondary" href="/facilitators/terry-brussel-rogers">
          View Terry Brussel-Rogers, CCHt
        </a>
      </section>

      <section className="card section">
        <h2>Apply to Become a Facilitator</h2>
        <p style={{ color: "#475569" }}>
          Tell us about your practice and how you plan to use Reach For The Stars with
          your clients-whether you intend to refer, manage, or both. Applications are
          reviewed by our team; approved facilitators get access to the platform and
          affiliate terms. If you plan to upload your own recordings, review our{" "}
          <a href="/creator-content-license">Creator Content License Agreement</a>.
        </p>
        <form onSubmit={submit} className="grid" style={{ marginTop: 16 }}>
          <input name="name" placeholder="Full name" required style={inputStyle} />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            required
            style={inputStyle}
          />
          <input
            name="focusAreas"
            placeholder="Focus areas (e.g. sleep, healing, trauma release)"
            required
            style={inputStyle}
          />
          <textarea
            name="experience"
            placeholder="Describe your relevant experience"
            required
            rows={5}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <input
            name="links"
            placeholder="Portfolio or website (optional)"
            style={inputStyle}
          />
          <input
            name="phone"
            placeholder="Phone (optional)"
            style={inputStyle}
          />
          <input
            name="website"
            placeholder="Website (optional)"
            style={inputStyle}
          />
          <input
            name="socialLinks"
            placeholder="Social links (comma-separated, optional)"
            style={inputStyle}
          />
          <input
            name="photoUrl"
            placeholder="Profile photo URL (optional)"
            style={inputStyle}
          />
          <button className="button" type="submit">
            Submit Application
          </button>
        </form>
        {status && <p style={{ marginTop: 12 }}>{status}</p>}
      </section>
      <SiteFooter showStartJourney={false} />
    </main>
  );
}
