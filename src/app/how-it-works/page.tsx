import SiteFooter from "@/components/SiteFooter";

export default function HowItWorksPage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">How It Works</span>
        <h1>Personalized sessions that build your goals while you sleep</h1>
        <p>
          Reach For The Stars turns your goals into a nightly session plan so you can
          reinforce new habits, focus, and confidence at the time your subconscious is
          most receptive.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">3 steps</span>
          <h2 className="section-title">Get started in minutes</h2>
          <p className="section-subtitle">
            Select your goals, register, and press Start Session.
          </p>
        </div>
        <div className="grid grid-3">
          <div className="card">
            <h3>1. Select your goals</h3>
            <p>
              Choose up to 10 priorities and order them by importance. This guides your
              nightly schedule.
            </p>
          </div>
          <div className="card">
            <h3>2. Register</h3>
            <p>
              Create your account with your email and complete registration to unlock
              your membership.
            </p>
          </div>
          <div className="card">
            <h3>3. Start your session</h3>
            <p>
              Tap Start Session to play your personalized lineup automatically each
              night.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Nightly flow</span>
          <h2 className="section-title">What happens each night</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3>Preparation + first goal</h3>
            <p>
              Each session begins with a short preparation audio, then your first goal
              recording starts right away.
            </p>
          </div>
          <div className="card">
            <h3>Second session later</h3>
            <p>
              If you select two sessions per night, a second recording plays about 2.5
              hours later to reinforce your goals while you sleep.
            </p>
          </div>
          <div className="card">
            <h3>Guided rotation</h3>
            <p>
              Your goals rotate in a structured order so each one is reinforced over
              time.
            </p>
          </div>
          <div className="card">
            <h3>1 or 2 sessions</h3>
            <p>
              You can choose 1 or 2 sessions per night. The default is 2 and the rotation
              stays consistent.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Your plan</span>
          <h2 className="section-title">Built around your goals</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3>Priorities drive the schedule</h3>
            <p>
              The order you choose matters. Your top goals appear earlier and repeat more
              consistently.
            </p>
          </div>
          <div className="card">
            <h3>Update windows</h3>
            <p>
              Goals can only be changed every 7 days. For best results, stick with your
              goals until you complete the full 21-times cycle — changing them sooner
              can interrupt effectiveness.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
