import { getModeratorApplicationBySlug } from "@/lib/db";
import { LGD_SEVEN_KEYS } from "@/lib/lgd-intake";
import { SIGNUP_PATH } from "@/lib/marketing-signup";
import SiteFooter from "@/components/SiteFooter";

export default async function TerryBrusselRogersPage() {
  const profile = await getModeratorApplicationBySlug("terry-brussel-rogers");
  const contactEmail = profile?.email || "";
  const contactPhone = profile?.phone || "";
  const contactWebsite = profile?.website || "https://www.acesuccess.com";
  const contactSocial = profile?.socialLinks || "";
  const photoUrl = profile?.photoUrl || "";
  const focusAreas = profile?.focusAreas || "";
  const experience = profile?.experience || "";

  return (
    <main>
      <section className="hero section">
        <span className="pill">Facilitator Spotlight</span>
        <h1>{profile?.name || "Terry Brussel-Rogers, CCHt"}</h1>
        <p>
          Certified Clinical Hypnotherapist registered with the National Guild of
          Hypnotists - pioneer of the Seven Keys to Self-Actualization.
        </p>
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h2>About Terry Brussel-Rogers, CCHt</h2>
          <p>
            With over five decades of experience, Terry Brussel-Rogers, CCHt has
            been helping clients reach their highest potential most of her life.
            She has done this through her Seven Keys to Self-Actualization, a
            systematic program which uses self-hypnosis within a customized
            framework to enable others to realize their personal goals, desires,
            and dreams.
          </p>
          <p>
            Terry graduated Cum Laude from California State University at
            Northridge with a B.A. in Psychology. She also studied for four years
            at the Hypnosis Motivation Institute, the Emile Franchel School of
            Living Science, and the Hypnotism Training Center.
          </p>
          <p>
            In her work in private practice and directing Success Center, Terry
            has assisted her clients and has taught hypnotists, healers, and
            coaches in the U.S., Canada, U.K., and many other countries to work
            with such issues as stress management, habit control, success/sales
            motivation, and learning/memory enhancement.
          </p>
          {experience && <p>{experience}</p>}
        </div>
        <div className="card">
          <h2>Facilitator Profile</h2>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${profile?.name || "Terry Brussel-Rogers"} profile`}
              style={{ width: "100%", borderRadius: 12, marginBottom: 12 }}
            />
          ) : (
            <div className="card" style={{ marginBottom: 12, textAlign: "center" }}>
              Photo coming soon.
            </div>
          )}
          <p>
            <strong>Specialty:</strong>{" "}
            {focusAreas ||
              "Seven Keys to Self-Actualization, Life Guidance Discovery, CGMR, self-hypnosis, and success motivation."}
          </p>
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Contact</h3>
            <p>
              <strong>Website:</strong>{" "}
              {contactWebsite ? (
                <a href={contactWebsite} target="_blank" rel="noreferrer">
                  {contactWebsite.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                "Available on request"
              )}
            </p>
            <p>
              <strong>Email:</strong>{" "}
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              ) : (
                "Available on request"
              )}
            </p>
            <p>
              <strong>Phone:</strong> {contactPhone || "Available on request"}
            </p>
            <p>
              <strong>Social:</strong> {contactSocial || "Available on request"}
            </p>
          </div>
        </div>
      </section>

      <section className="card section">
        <h2>What makes Terry unique as a facilitator</h2>
        <p>
          Most coaches collect goals. Terry built a <strong>complete system</strong> - the Seven
          Keys to Self-Actualization - so clients move from problem resolution to their highest
          potential <em>physically, mentally, emotionally, spiritually, and financially</em>. That
          system is the backbone of Life Guidance Discovery on Reach For The Stars.
        </p>
        <ul style={{ lineHeight: 1.55 }}>
          <li>
            <strong>Bronze first, always.</strong> Self-hypnosis is the foundation before every
            other Key - so change installs in the subconscious, not only as a to-do list.
          </li>
          <li>
            <strong>Customized roadmap, not a one-size script.</strong> Challenges + Key order
            become Essentials and Growth paths (her classic LGDR), paired with a Customized Goal
            Manifestation Recording (CGMR) as the overview and supporting audios that implement.
          </li>
          <li>
            <strong>Telephone &amp; remote hypnosis pioneer (1995).</strong> Sessions work from the
            client’s own environment - the same place they will practice self-hypnosis and sleep
            listening.
          </li>
          <li>
            <strong>Trainer of facilitators worldwide.</strong> Through Success Center she has
            taught hypnotists, healers, and coaches to deliver the Seven Keys - so the method
            scales without losing the structure.
          </li>
          <li>
            <strong>Annual renewal built in.</strong> Life Guidance Renewal updates goals and the
            CGMR as life changes - ongoing growth, not a one-time workshop.
          </li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          On this platform, members complete an electronic LGD that captures challenges and Seven
          Keys order; Terry (or an assigned facilitator) reviews the brief and Goal Manifestation
          draft the way a live Life Guidance Discovery session prepares the path.
        </p>
      </section>

      <section className="card section">
        <h2>The Seven Keys to Self-Actualization</h2>
        <p>
          A systematic program of personal growth using self-hypnosis. The Bronze Key must be taken
          before any other Key; the rest may be taken in the order that fits the client.
        </p>
        <div className="stack" style={{ gap: 14 }}>
          {LGD_SEVEN_KEYS.map((key, index) => (
            <div key={key.id}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                {index + 1}. {key.metal} Key - {key.label}
                {key.id === "bronze" ? " (always first)" : ""}
              </p>
              <p style={{ margin: "4px 0 0", color: "#475569" }}>{key.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card section">
        <h2>Presentation</h2>
        <p>
          Terry offers the Seven Keys to Self-Actualization, a structured
          self-hypnosis framework designed to help individuals align their habits
          with their goals. She also develops audio recordings and educational
          resources focused on stress to success strategies, healthy longevity,
          memory and mental excellence, and personal transformation - including
          Customized Goal Manifestation Recordings (CGMR) used with night listening
          on Reach For The Stars.
        </p>
        <div className="cta-row" style={{ gap: 8, flexWrap: "wrap" }}>
          <a className="button" href="/life-guidance-discovery">
            Life Guidance Discovery
          </a>
          <a className="button button-secondary" href={SIGNUP_PATH}>
            Join Reach For The Stars
          </a>
        </div>
      </section>

      <section className="card section">
        <h2>Published Work</h2>
        <div className="stack">
          <p>Seven Key Turn-Key System for Building a Successful Hypnotherapy Practice</p>
          <p>Matchmaker&apos;s Corner: Choosing, Finding and Attracting Your Life Mate</p>
          <p>The Spiritual Spark: Hypnotic Enhancement of Psychic Abilities</p>
          <p>Inspiration at Will</p>
          <p>Take Command of Your Body: The Hypnotic Fountain of Youth</p>
          <p>Stress to Success Stress Strategists (Royal Publishing)</p>
          <p>Slow Down and Turn Back the Aging Process for Healthy Longevity</p>
          <p>Memory and Mental Excellence Through Self Hypnosis</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
