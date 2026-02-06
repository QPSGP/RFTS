import SiteFooter from "@/components/SiteFooter";

export default function SciencePage() {
  return (
    <main>
      <section className="hero section">
        <span className="pill">Science</span>
        <h1>Why this approach works</h1>
        <p>
          Reach For The Stars combines guided meditation, goal priming, and consistent
          repetition during sleep transitions to reinforce new patterns over time.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Brain state</span>
          <h2 className="section-title">Sleep, suggestion, and repetition</h2>
        </div>
        <div className="grid grid-2">
          <div className="card">
            <h3>Priming before sleep</h3>
            <p>
              The period as you fall asleep is a high-suggestibility window. Guided
              prompts paired with relaxation help the brain encode new intentions.
            </p>
          </div>
          <div className="card">
            <h3>Repetition builds pathways</h3>
            <p>
              Hearing the same goal-based messages repeatedly strengthens mental
              associations, supporting new habits and focus over time.
            </p>
          </div>
          <div className="card">
            <h3>Consistency matters</h3>
            <p>
              A structured schedule keeps the practice steady, which is key for lasting
              change and motivation.
            </p>
          </div>
          <div className="card">
            <h3>Two-session reinforcement</h3>
            <p>
              A second recording later in the night reinforces goals while you are still
              in restorative sleep.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Benefits</span>
          <h2 className="section-title">Evidence-backed outcomes</h2>
          <p className="section-subtitle">
            Guided meditation research supports improvements in these areas.
          </p>
        </div>
        <div className="grid grid-3">
          <div className="card">Reduced stress and anxiety</div>
          <div className="card">Better sleep quality</div>
          <div className="card">Improved focus and attention</div>
          <div className="card">Emotional regulation</div>
          <div className="card">Pain coping skills</div>
          <div className="card">Greater self-awareness</div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Sources</span>
          <h2 className="section-title">Research and reading</h2>
        </div>
        <div className="card">
          <ul className="list">
            <li>https://www.degruyter.com/document/doi/10.1515/hmbci-2013-0056/html</li>
            <li>https://www.health.harvard.edu/staying-healthy/what-meditation-can-do-for-your-mind-mood-and-health-</li>
            <li>https://health.ucdavis.edu/health-news/newsroom/10-health-benefits-of-meditation/2019/07</li>
            <li>https://www.mayoclinic.org/tests-procedures/meditation/about/pac-20385120</li>
            <li>https://sps.columbia.edu/news/how-meditation-can-help-you-focus</li>
            <li>https://news.harvard.edu/gazette/story/2011/01/eight-weeks-to-a-better-brain/</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="card glow">
          <h2>Put the science to work</h2>
          <p>
            Start your journey building your personalized nightly sessions.
          </p>
          <a className="button" href="/signup/step-1-subscription-selection">
            Start Your Journey
          </a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
