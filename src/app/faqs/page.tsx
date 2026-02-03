export default function FaqsPage() {
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

      <section className="grid">
        <div className="card">
          <h3>What is Reach For The Stars?</h3>
          <p>
            A guided audio membership that builds a personalized sleep session based on
            your goals. You choose up to 10 goals and the system schedules the right
            recordings for you each night.
          </p>
        </div>

        <div className="card">
          <h3>How do I start?</h3>
          <ol>
            <li>Choose a subscription plan.</li>
            <li>Select up to 10 goals (in priority order).</li>
            <li>Tap Start Session on your Play Options page.</li>
          </ol>
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
            The schedule rotates through your selected goals so each goal receives repeat
            listening over time. Your priority order helps guide which goals appear
            earlier in the rotation.
          </p>
        </div>

        <div className="card">
          <h3>Can I change my goals?</h3>
          <p>
            Yes, but changes are limited by your membership tier (for example, every 30
            or 90 days). This keeps your session plan consistent and effective.
          </p>
        </div>

        <div className="card">
          <h3>Why are my goals limited to 10?</h3>
          <p>
            Ten goals keeps your lineup focused and effective. It also ensures your
            highest priorities are reinforced regularly in your session plan.
          </p>
        </div>

        <div className="card">
          <h3>Do I need to stay awake while listening?</h3>
          <p>
            No. These sessions are designed for sleep. The system schedules a second
            recording later in the night to reinforce your goals while you rest.
          </p>
        </div>

        <div className="card">
          <h3>What if audio will not start on my phone?</h3>
          <p>
            Some phones (especially iPhone) require a tap to begin audio. If autoplay is
            blocked, a big Tap to Start button appears to begin playback right away.
          </p>
        </div>

        <div className="card">
          <h3>How is billing handled?</h3>
          <p>
            Payments are managed securely through Stripe. You can update payment details
            and view subscription status from your member options.
          </p>
        </div>
      </section>

      <section className="grid" style={{ marginTop: 24 }}>
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
      </section>
    </main>
  );
}
