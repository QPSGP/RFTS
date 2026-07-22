import SiteFooter from "@/components/SiteFooter";
import {
  MeditationSourcesCard,
  ScienceOutcomesGrid
} from "@/components/MeditationBenefits";

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
              The period as you fall asleep and during sleep is a high-suggestibility window. Guided
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
        <ScienceOutcomesGrid />
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Sources</span>
          <h2 className="section-title">Research and reading</h2>
        </div>
        <MeditationSourcesCard idPrefix="science-source" />
      </section>

      <SiteFooter />
    </main>
  );
}
