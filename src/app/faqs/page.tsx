"use client";

import { useState } from "react";

type SectionKey = "who" | "what" | "where" | "why" | "help";

export default function FaqsPage() {
  const [openSection, setOpenSection] = useState<SectionKey>("who");
  return (
    <main>
      <section className="hero section">
        <span className="pill">Member FAQs</span>
        <h1>Questions from future members</h1>
        <p>
          Clear answers about how Reach For The Stars works, what to expect, and how to
          get the most from your sessions.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Who</span>
          <button
            className="section-title"
            type="button"
            onClick={() => setOpenSection("who")}
          >
            Who this is for
          </button>
        </div>
        {openSection === "who" && (
          <div className="grid">
          <div className="card">
            <h3>Why you will use it?</h3>
            <p>
              The subconscious mind influences about <strong>95%</strong> of our thoughts,
              emotions, and behaviors, often operating without our conscious awareness.
              While we may not have direct control over it, we can influence our
              subconscious through conscious beliefs and habits.
            </p>
            <p>
              If you are not programming your subconsciousness than who is? Customize
              yours by you for you.
            </p>
          </div>

          <div className="card">
            <h3>Who is Reach For The Stars for?</h3>
            <p>
              For people who want customized guided, goal-based sleep sessions to build
              new habits, improve focus, and reinforce personal priorities while
              sleeping.
            </p>
          </div>
        </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">What</span>
          <button
            className="section-title"
            type="button"
            onClick={() => setOpenSection("what")}
          >
            What to expect
          </button>
        </div>
        {openSection === "what" && (
          <div className="grid">
          <div className="card">
            <h3>What is Reach For The Stars?</h3>
            <p>
              A guided audio membership that builds a personalized sleep session based on
              your goals. You choose up to 10 goals and the system schedules the right
              recordings for you each night.
            </p>
          </div>

          <div className="card">
            <h3>What happens during a session?</h3>
            <p>
              Each session begins with a short preparation audio, then your first goal
              recording starts immediately. A second recording can play about 2.5 hours
              later if you choose two sessions per night.
            </p>
          </div>

          <div className="card">
            <h3>Can I choose 1 or 2 recordings per night?</h3>
            <p>
              Yes. Members can choose 1 or 2 sessions per night. The default is 2, and the
              rest of the rotation is managed by the program.
            </p>
          </div>

          <div className="card">
            <h3>How does the rotation work?</h3>
            <p>
              The schedule rotates through your selected goals so each goal receives
              repeat listening over time. Your priority order helps guide which goals
              appear earlier in the rotation.
            </p>
          </div>

          <div className="card">
            <h3>Do I need to stay awake while listening?</h3>
            <p>
              No. These sessions are designed for when your subconscious is most
              susceptible to suggestions as you are falling asleep. About 2.5 hours
              later, the second recording comes on to reinforce your goals while you are
              sleeping.
            </p>
          </div>
        </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Where</span>
          <button
            className="section-title"
            type="button"
            onClick={() => setOpenSection("where")}
          >
            Where to begin and manage
          </button>
        </div>
        {openSection === "where" && (
          <div className="grid">
          <div className="card">
            <h3>Where do I start?</h3>
            <ol>
              <li>Choose a subscription plan.</li>
              <li>Select up to 10 goals (in priority order).</li>
              <li>Tap Start Session on your Play Options page.</li>
            </ol>
          </div>

          <div className="card">
            <h3>What if audio will not start on my phone?</h3>
            <p>
              Some phones (especially iPhone) require a tap to begin audio. If autoplay is
              blocked, a big Tap to Start button appears to begin playback right away.
            </p>
          </div>

          <div className="card">
            <h3>Where do I manage billing?</h3>
            <p>
              Payments are managed securely through Stripe. You can update payment details
              and view subscription status from your member options.
            </p>
          </div>
        </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Why</span>
          <button
            className="section-title"
            type="button"
            onClick={() => setOpenSection("why")}
          >
            Why the structure matters
          </button>
        </div>
        {openSection === "why" && (
          <div className="grid">
          <div className="card">
            <h3>Why are my goals limited to 10?</h3>
            <p>
              Ten goals keeps your lineup focused and effective. It also ensures your
              highest priorities are reinforced regularly in your session plan.
            </p>
          </div>

          <div className="card">
            <h3>Why are goal changes limited?</h3>
            <p>
              Goal changes are limited by your membership tier (for example, every 30 or
              90 days). This keeps your session plan consistent and effective.
            </p>
          </div>
        </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Help</span>
          <button
            className="section-title"
            type="button"
            onClick={() => setOpenSection("help")}
          >
            Help and tips
          </button>
        </div>
        {openSection === "help" && (
          <div className="grid">
            <div className="card">
              <h3>Need help?</h3>
              <p>Email: customerservice@reachforthestars.today</p>
              <p>Phone: 800-GOAL-NOW (462-5669)</p>
            </div>
            <div className="card">
              <h3>Quick tips for best results</h3>
              <ul>
                <li>Keep your phone on a charger near your bed.</li>
                <li>Use the Pause/Play/Restart controls if you wake up.</li>
                <li>Stick with your goals long enough to complete a full cycle.</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
