"use client";

import { useState } from "react";

const inputStyle = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  width: "100%"
};

export default function ModerationPage() {
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
    setStatus("Something went wrong. Please review your responses and try again.");
  };

  return (
    <main>
      <section className="hero section">
        <span className="pill">Co-Creation Council</span>
        <h1>Co-Creator Application</h1>
        <p>
          We are building a co-creator community devoted to uplifting personal growth,
          emotional resilience, and expanded awareness. Help us add and guide
          audio content that supports transformation in a safe, focused environment.
        </p>
      </section>

      <section className="grid grid-3 section">
        <div className="card">
          <h3>Our Mission</h3>
          <p>
            Protect the integrity of the experience while elevating recordings that
            foster healing, clarity, and higher consciousness.
          </p>
        </div>
        <div className="card">
          <h3>What Co-Creators Do</h3>
          <p>
            Contribute new recordings, refine descriptions, and ensure each session
            aligns with member goals and ethics.
          </p>
        </div>
        <div className="card">
          <h3>Who We’re Seeking</h3>
          <p>
            Hypnotherapists, wellness guides, coaches, and mindful practitioners who
            want to shape a trusted healing platform.
          </p>
        </div>
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h3>Co-Creation Standards</h3>
          <div className="stack">
            <p>Clear, calming, and non-manipulative language.</p>
            <p>Respectful handling of sensitive or adult content.</p>
            <p>Accurate titles, descriptions, and goal mappings.</p>
            <p>Aligned with constructive, consciousness-expanding outcomes.</p>
          </div>
        </div>
        <div className="card">
          <h3>Why Join</h3>
          <div className="stack">
            <p>Shape a growing library of transformational recordings.</p>
            <p>Collaborate with a vetted community of practitioners.</p>
            <p>Help members reach mental, emotional, and spiritual clarity.</p>
            <p>Be recognized as a contributor to a mission-driven platform.</p>
          </div>
        </div>
      </section>

      <section className="card section">
        <h2>Featured Co-Creator</h2>
        <p style={{ color: "#475569" }}>
          Learn more about our first Co-Creator and her contribution to the
          Reach For The Stars experience.
        </p>
        <a className="button button-secondary" href="/co-creators/terry-brussel-rogers">
          View Terry Brussel-Rogers, CCHt
        </a>
      </section>

      <section className="card section">
        <h2>Apply to Become a Co-Creator</h2>
        <p style={{ color: "#475569" }}>
          Tell us about your background and the type of consciousness-focused work
          you want to help cultivate. Applications are reviewed by the Success Center
          team.
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
    </main>
  );
}
