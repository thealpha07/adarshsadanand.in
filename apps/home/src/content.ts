/**
 * Everything the homepage says, in one place.
 * Edit words here; layout lives in App.tsx and home.css.
 * Two-tone headings are [ink, soft, ink] triples.
 */

import type { SiteKey } from "@site/ui";

export const hero = {
  firstName: "Adarsh",
  ghostWord: "Engineer",
  line: "I absorb, comprehend and build stuff. Neurodivergent, but I get things done.",
  role: "Tech Enthusiast",
  fullName: "Adarsh Sadanand",
  portraitAlt: "Adarsh laughing, arms crossed, in a navy kurta",
};

export const about = {
  heading: ["Meaningful", "work, growth, and recognition", "— beyond just a paycheck"] as const,
  bio:
    "A postgraduate student in Computer Science at Ramaiah Institute of Technology and, since August 2026, an intern at ArcherIRM, where I'm moving into governance, risk and compliance. Before that I spent over three and a half years as a Product Engineer at Multifonds, formerly part of Temenos. I can code, but I truly enjoy programming complete systems.",
  resumeHref: "/Adarsh_Sadanand_Resume.pdf",
};

/** "Off the clock": hobbies. Keep notes short; the title carries the card. */
export interface Hobby {
  title: string;
  note: string;
  /** Optional link to one of the sites. */
  link?: SiteKey;
}

export const hobbies: { heading: readonly [string, string, string]; items: Hobby[] } = {
  heading: ["When I'm", "not", "building"],
  items: [
    { title: "Cycling", note: "Getting out on two wheels, away from every screen." },
    { title: "Dungeons & Dragons", note: "Tabletop campaigns and the stories a table of friends makes up together." },
    { title: "Anime & manga", note: "Plus manhua and light novels. The queue never gets shorter." },
    { title: "Reading & collecting", note: "Literature and mythology, and a shelf of things I collect.", link: "library" },
  ],
};

/** Heading for the live "What I'm learning" section; the topics come from the vault. */
export const learning = {
  heading: ["What I'm", "learning", ""] as const,
};

export const whatIDo = {
  heading: ["Engineering", "systems, workflows", "& solutions"] as const,
  areas: [
    {
      title: "Product engineering",
      desc: "Designing and tuning PL/SQL packages and stored procedures that move data reliably through a financial product. Fixing what breaks, and making it stay fixed.",
      skills: ["SQL", "PL/SQL", "Oracle Forms & Reports", "DBMS"],
      visual: "SELECT fund_id, nav\n  FROM valuations\n WHERE run_date = :today;\n\n-- tuned, tested, translated",
    },
    {
      title: "Internal tools & workflows",
      desc: "Building tools and processes that remove repetitive work and make support transparent, from bug-logging dashboards to version-control standards.",
      skills: ["Oracle APEX", "Python", "Git / Bitbucket", "Figma prototyping"],
      visual: "REPORT  →  TRIAGE\n   ↓          ↓\n  LOG   ←    FIX\n\nteam efficiency +15–200%",
    },
    {
      title: "Governance, risk & compliance",
      desc: "Learning how organisations measure and manage risk, and building systems that make compliance clear instead of painful.",
      skills: ["GRC", "Risk frameworks", "Compliance workflows", "MongoDB"],
      visual: "RISK = LIKELIHOOD × IMPACT\n\ncontrols → evidence → audit",
    },
  ],
};

export interface Project {
  name: string;
  kind: string;
  line: string;
  desc: string;
  stack: string;
  href: string;
  /** Path under /public/images, or null for a placeholder. */
  image: string | null;
}

export const projects: Project[] = [
  {
    name: "Ritus",
    kind: "/Linux · OS",
    line: "RIT User Systems",
    desc: "A customised Ubuntu-based Linux distribution with process visualisation, system memory monitoring and baseline security tools.",
    stack: "Python · Linux · OS internals",
    href: "https://github.com/thealpha07/RITUS_OS",
    image: null,
  },
  {
    name: "Noe Waves",
    kind: "/Machine learning",
    line: "Epileptic seizure recognition",
    desc: "A Python web app that classifies EEG recordings with machine learning models to flag seizure activity, deployed on Heroku.",
    stack: "Python · ML · Heroku",
    href: "https://github.com/thealpha07/Heroku-Noe-Waves",
    image: null,
  },
];
