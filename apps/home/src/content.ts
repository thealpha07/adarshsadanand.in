/**
 * Everything the homepage says, in one place.
 * Edit words here; layout lives in App.tsx and home.css.
 * Two-tone headings are [ink, soft, ink] triples.
 */

export const hero = {
  firstName: "Adarsh",
  ghostWord: "Engineer",
  line: "I absorb, comprehend and build stuff. Neurodivergent, and I get things done.",
  role: "Technology Enthusiast",
  fullName: "Adarsh Sadanand",
  portraitAlt: "Adarsh laughing, arms crossed, in a navy kurta",
};

export const about = {
  heading: ["Meaningful", "work, growth, and recognition", "— beyond just a paycheck"] as const,
  bio:
    "I'm a postgraduate student in Computer Science at Ramaiah Institute of Technology and, since August 2026, an intern at ArcherIRM, where I'm moving into governance, risk and compliance. Before that I spent over three years as a Product Engineer at Multifonds, formerly part of Temenos. I can code, but what I enjoy is programming whole systems. Away from the screen I collect things and read everything: literature, manga, light novels and mythology.",
  resumeHref: "/Adarsh_Sadanand_Resume.pdf",
};

export const facts = [
  { label: "Product engineering", value: "3+ yrs", note: "At Multifonds, Jul 2022 – Nov 2025" },
  { label: "Issues resolved", value: "90+/yr", note: "Two years running" },
  { label: "Team led", value: "6", note: "Product-wide decimal precision upgrade" },
  { label: "Recognition", value: "Emerging Star", note: "Award from the Product Support Head, 2025" },
];

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
    href: "https://github.com/thealpha07",
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
  {
    name: "Parking Management",
    kind: "/Desktop app",
    line: "Slots, bookings and receipts",
    desc: "A NetBeans GUI application that manages parking slots using file-structure techniques, with calendar booking and PDF receipts.",
    stack: "Java · NetBeans · iText · jCalendar",
    href: "https://github.com/thealpha07/ParkingManagement",
    image: null,
  },
  {
    name: "Azathoth",
    kind: "/Web platform",
    line: "This site and its subdomains",
    desc: "My personal platform: a portfolio with Thoughts, a library, a people journal and a private file vault, built as one system.",
    stack: "TypeScript · React · Supabase · Cloudflare",
    href: "https://github.com/thealpha07/adarshsadanand.in",
    image: null,
  },
];
