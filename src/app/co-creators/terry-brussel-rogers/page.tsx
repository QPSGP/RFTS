import { getModeratorApplicationBySlug } from "@/lib/db";
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
        <span className="pill">Co-Creator Spotlight</span>
        <h1>{profile?.name || "Terry Brussel-Rogers, CCHt"}</h1>
        <p>
          Certified Clinical Hypnotherapist registered with the National Guild of
          Hypnotists.
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
          {experience && (
            <p>
              {experience}
            </p>
          )}
        </div>
        <div className="card">
          <h2>Co-Creator Profile</h2>
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
              "Self-hypnosis, stress management, habit change, success motivation, and learning/memory enhancement."}
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
        <h2>Presentation</h2>
        <p>
          Terry offers the Seven Keys to Self-Actualization, a structured
          self-hypnosis framework designed to help individuals align their habits
          with their goals. She also develops audio recordings and educational
          resources focused on stress to success strategies, healthy longevity,
          memory and mental excellence, and personal transformation.
        </p>
      </section>

      <section className="card section">
        <h2>Published Work</h2>
        <div className="stack">
          <p>Seven Key Turn-Key System for Building a Successful Hypnotherapy Practice</p>
          <p>Matchmaker's Corner: Choosing, Finding and Attracting Your Life Mate</p>
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
