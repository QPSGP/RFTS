/** Homepage goal cards - shared by home page and goal landing pages. */
export const HOMEPAGE_GOAL_CARDS = [
  {
    slug: "health",
    label: "Health",
    path: "/health",
    imageSrc: "/Images/Health.jpg",
    tagline: "Healthy longevity, vibrant energy, a body to delight in"
  },
  {
    slug: "wealth",
    label: "Wealth",
    path: "/wealth",
    imageSrc: "/Images/Wealth.jpeg",
    tagline: "Financial Abundance"
  },
  {
    slug: "relationship",
    label: "Relationship",
    path: "/relationship",
    imageSrc: "/Images/Relationship.jpeg",
    tagline: "A joyful new or enhanced present relationship"
  },
  {
    slug: "memory",
    label: "Memory",
    path: "/memory",
    imageSrc: "/Images/Memory.jpg",
    tagline: "The memory and mental focus you want now and lifelong"
  },
  {
    slug: "inspiration",
    label: "Inspiration",
    path: "/inspiration",
    imageSrc: "/Images/Inspiration.jpg",
    tagline: "Inspiration at Will for creative and entrepreneurial endeavors"
  },
  {
    slug: "spirituality",
    label: "Spirituality",
    path: "/spirituality",
    imageSrc: "/Images/Spirtuality.jpg",
    tagline: "A greater connection with your spirituality"
  },
  {
    slug: "overcoming-addiction",
    label: "Overcoming Addiction",
    path: "/overcoming-addiction",
    imageSrc: "/Images/BalancedLife.jpg",
    tagline: "Freedom from smoking, overeating, and other unwanted habits"
  },
  {
    slug: "balanced-life",
    label: "Balanced Life",
    path: "/balanced-life",
    imageSrc: "/Images/BalancedLife.png",
    /** Framed dual portrait - contain keeps the full artwork in the same 16:10 card as other goals. */
    imageFit: "contain" as const,
    tagline:
      "Reach your highest potential in areas physical, mental, emotional and spiritual as well as financial!"
  }
] as const;

export type GoalLandingSlug = (typeof HOMEPAGE_GOAL_CARDS)[number]["slug"];

export const GOAL_LANDING_SLUGS: GoalLandingSlug[] = HOMEPAGE_GOAL_CARDS.map((g) => g.slug);
