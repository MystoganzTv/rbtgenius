export const STORE_PRODUCTS = [
  {
    id: "rbt-session-clipboard-kit",
    name: "RBT Session Clipboard Kit",
    category: "Daily Tools",
    format: "physical",
    price_cents: 2400,
    summary:
      "A practical clipboard-and-checklist bundle for data collection, session notes, and quick routines.",
    checkout_description:
      "Clipboard bundle for session notes, data collection, and daily RBT routines.",
    badge: "Most useful",
    bullets: [
      "Session checklist layout",
      "Quick data prompts",
      "Daily routine support",
    ],
  },
  {
    id: "reinforcer-pouch-essentials",
    name: "Reinforcer Pouch Essentials",
    category: "Daily Tools",
    format: "physical",
    price_cents: 1800,
    summary:
      "A small grab-and-go pouch setup for tokens, visuals, timers, and mini session tools.",
    checkout_description:
      "Portable reinforcer and visuals pouch for everyday RBT sessions.",
    badge: "Portable",
    bullets: [
      "Token and visual storage",
      "Compact daily carry",
      "Built for session flow",
    ],
  },
  {
    id: "rbt-rapid-review-book",
    name: "RBT Rapid Review Book",
    category: "Study Books",
    format: "physical",
    price_cents: 2900,
    summary:
      "A focused review book built around key RBT concepts, short explanations, and study prompts.",
    checkout_description:
      "Focused RBT study book with concise explanations and review prompts.",
    badge: "Study favorite",
    bullets: [
      "Quick concept reviews",
      "Simple study structure",
      "Great for short sessions",
    ],
  },
  {
    id: "mock-exam-workbook",
    name: "Mock Exam Workbook",
    category: "Study Books",
    format: "physical",
    price_cents: 3400,
    summary:
      "A workbook with mock-style practice, answer review, and confidence-building drills.",
    checkout_description:
      "Workbook with mock-style practice, answer review, and study drills.",
    badge: "Exam prep",
    bullets: [
      "Mock-style question sets",
      "Space for review notes",
      "Helps tighten weak areas",
    ],
  },
  {
    id: "visual-study-card-bundle",
    name: "Visual Study Card Bundle",
    category: "Study Aids",
    format: "physical",
    price_cents: 2200,
    summary:
      "Concept cards and visual cues for memorization, quick review, and last-minute refreshers.",
    checkout_description:
      "Visual study cards for memorization and quick RBT review.",
    badge: "Quick review",
    bullets: [
      "Portable concept cards",
      "Fast memorization support",
      "Helpful before mocks",
    ],
  },
  {
    id: "rbt-starter-study-pack",
    name: "RBT Starter Study Pack",
    category: "Bundles",
    format: "physical",
    price_cents: 4200,
    summary:
      "A starter bundle that combines practical tools and study materials in one simpler order.",
    checkout_description:
      "Starter bundle with daily tools and study materials for RBT prep.",
    badge: "Bundle",
    bullets: [
      "Mix of tools and study aids",
      "Best for new learners",
      "One easier bundle order",
    ],
  },
];

export function getStoreProductById(productId) {
  return STORE_PRODUCTS.find((product) => product.id === productId) || null;
}

export function formatStorePrice(priceCents) {
  return `$${(Number(priceCents || 0) / 100).toFixed(2)}`;
}
