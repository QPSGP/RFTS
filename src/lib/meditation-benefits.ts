/** Research sources for meditation benefits (index 0 = source 1 in citations). */
export const MEDITATION_SOURCES = [
  {
    title: "De Gruyter — mindfulness and health research review",
    href: "https://www.degruyter.com/document/doi/10.1515/hmbci-2013-0056/html"
  },
  {
    title: "Harvard Health — what meditation can do for your mind, mood, and health",
    href: "https://www.health.harvard.edu/staying-healthy/what-meditation-can-do-for-your-mind-mood-and-health-"
  },
  {
    title: "NIH NCCIH — meditation and mindfulness: what you need to know",
    href: "https://www.nccih.nih.gov/health/meditation-and-mindfulness-what-you-need-to-know"
  },
  {
    title: "Mayo Clinic — meditation overview and health benefits",
    href: "https://www.mayoclinic.org/tests-procedures/meditation/about/pac-20385120"
  },
  {
    title: "Columbia University — how meditation can help you focus",
    href: "https://sps.columbia.edu/news/how-meditation-can-help-you-focus"
  },
  {
    title: "Harvard Gazette — eight weeks to a better brain (MGH/Harvard study)",
    href: "https://news.harvard.edu/gazette/story/2011/01/eight-weeks-to-a-better-brain/"
  }
] as const;

/** Homepage benefits and footer wellness links — paths map to existing or new landing pages. */
export const WELLNESS_BENEFIT_LINKS: {
  label: string;
  path: string;
  sourceIndex: number;
}[] = [
  { label: "Reduced Stress", path: "/stress-relief", sourceIndex: 1 },
  { label: "Memory Enhancement", path: "/memory-improvement", sourceIndex: 5 },
  { label: "Blood Pressure Regulation", path: "/blood-pressure-regulation", sourceIndex: 3 },
  { label: "Better Pain Management", path: "/pain-relief", sourceIndex: 3 },
  { label: "Better Sleep", path: "/sleep-meditation", sourceIndex: 2 },
  { label: "Physical/Psychological Resilience", path: "/resilience-meditation", sourceIndex: 0 },
  { label: "Increased Focus & Attention Span", path: "/memory-improvement", sourceIndex: 4 },
  { label: "Improved Emotional Health", path: "/emotional-health", sourceIndex: 1 },
  { label: "Enhanced Will Power", path: "/will-power", sourceIndex: 5 },
  { label: "Greater Self-Awareness", path: "/self-awareness", sourceIndex: 3 }
];
