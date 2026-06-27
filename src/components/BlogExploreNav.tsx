import { GOAL_LANDING_PAGES } from "@/lib/goal-landing-pages";
import { WELLNESS_BENEFIT_LINKS } from "@/lib/meditation-benefits";

export default function BlogExploreNav() {
  return (
    <div className="blog-explore-nav">
      <details className="login-toggle">
        <summary>Goals</summary>
        <div className="menu-panel">
          {GOAL_LANDING_PAGES.map((page) => (
            <a key={page.slug} href={page.path}>{page.label}</a>
          ))}
        </div>
      </details>
      <details className="login-toggle">
        <summary>Wellness</summary>
        <div className="menu-panel">
          {WELLNESS_BENEFIT_LINKS.map((benefit) => (
            <a key={benefit.label} href={benefit.path}>{benefit.label}</a>
          ))}
        </div>
      </details>
    </div>
  );
}
