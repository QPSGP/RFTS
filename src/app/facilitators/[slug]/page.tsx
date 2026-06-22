import { getModeratorApplicationBySlug } from "@/lib/db";
import SiteFooter from "@/components/SiteFooter";
import { notFound } from "next/navigation";

type PageProps = {
  params: { slug: string };
};

export default async function FacilitatorProfilePage({ params }: PageProps) {
  const profile = await getModeratorApplicationBySlug(params.slug);
  if (!profile || profile.status !== "approved") {
    notFound();
  }

  const contactWebsite = profile.website?.trim() || profile.links?.trim() || "";
  const socialLinks = (profile.socialLinks || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <main>
      <section className="hero section">
        <span className="pill">Facilitator Spotlight</span>
        <h1>{profile.name}</h1>
        {profile.focusAreas && <p>{profile.focusAreas}</p>}
      </section>

      <section className="grid grid-2 section">
        <div className="card">
          <h2>About {profile.name}</h2>
          {profile.experience ? (
            <p style={{ whiteSpace: "pre-wrap" }}>{profile.experience}</p>
          ) : (
            <p>Profile details coming soon.</p>
          )}
        </div>
        <div className="card">
          <h2>Facilitator Profile</h2>
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt={`${profile.name} profile`}
              style={{ width: "100%", borderRadius: 12, marginBottom: 12 }}
            />
          ) : (
            <div className="card" style={{ marginBottom: 12, textAlign: "center" }}>
              Photo coming soon.
            </div>
          )}
          {profile.focusAreas && (
            <p>
              <strong>Specialty:</strong> {profile.focusAreas}
            </p>
          )}
          <div className="card" style={{ marginTop: 12 }}>
            <h3 style={{ marginTop: 0 }}>Contact</h3>
            {contactWebsite && (
              <p>
                <strong>Website:</strong>{" "}
                <a href={contactWebsite} target="_blank" rel="noreferrer">
                  {contactWebsite.replace(/^https?:\/\//, "")}
                </a>
              </p>
            )}
            {profile.email && (
              <p>
                <strong>Email:</strong>{" "}
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </p>
            )}
            {profile.phone && (
              <p>
                <strong>Phone:</strong> {profile.phone}
              </p>
            )}
            {socialLinks.length > 0 && (
              <div className="stack">
                <strong>Social:</strong>
                {socialLinks.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer">
                    {link.replace(/^https?:\/\//, "")}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card section">
        <h2>Work with {profile.name.split(",")[0]}</h2>
        <p>
          Reach For The Stars facilitators help clients use guided audio for transformation,
          habit change, and personal growth. Contact them directly to learn how they integrate
          the platform into their practice.
        </p>
        <a className="button button-secondary" href="/facilitator">
          Become a Facilitator
        </a>
      </section>
      <SiteFooter />
    </main>
  );
}
