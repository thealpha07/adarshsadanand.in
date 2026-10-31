/**
 * Everything the CCI page says, in one place. Edit words here; layout lives in App.tsx.
 * This is the holding page for the project; the tool itself will grow beside it.
 */

export const intro = {
  title: "Cyber Capability",
  soft: "Index",
  line:
    "A scoring tool for the Cyber Capability Index in SEBI's Cybersecurity and Cyber Resilience Framework (CSCRF). It's my M.Tech project, and it's being built now.",
};

/** What the tool is for. Written as plans, because none of it is live yet. */
export const plan = [
  {
    title: "Assess",
    desc: "Walk one organisation through the CSCRF capability parameters, one question at a time, with the evidence each answer needs.",
  },
  {
    title: "Score",
    desc: "Turn those answers into a Cyber Capability Index and a maturity level, with every step of the calculation visible.",
  },
  {
    title: "Improve",
    desc: "Show where the score is lost and which gaps to close first, so the result is a to-do list rather than just a number.",
  },
];

export type Stage = "done" | "now" | "next";
export const timeline: { when: string; title: string; desc: string; stage: Stage }[] = [
  { when: "Semester 3", title: "Design and first release", desc: "Research, feasibility and design, then a working part of the tool, published here.", stage: "now" },
  { when: "Semester 4", title: "Complete tool and validation", desc: "The full tool, validated with a real organisation, ready for technology transfer.", stage: "next" },
];

export const credit = "Project Work · M.Tech in Computer Science, Ramaiah Institute of Technology";
