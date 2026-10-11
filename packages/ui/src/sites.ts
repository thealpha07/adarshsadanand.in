/**
 * Where each site lives. One table, so a link never points at a stale URL.
 * In development every app runs on its own port; in production on its own subdomain.
 */
export type SiteKey = "home" | "thoughts" | "library" | "people" | "vault";

const production: Record<SiteKey, string> = {
  home: "https://adarshsadanand.in",
  thoughts: "https://blog.adarshsadanand.in",
  library: "https://books.adarshsadanand.in",
  people: "https://characters.adarshsadanand.in",
  vault: "https://files.adarshsadanand.in",
};

const development: Record<SiteKey, string> = {
  home: "http://localhost:5170",
  thoughts: "http://localhost:5171",
  library: "http://localhost:5172",
  people: "http://localhost:5173",
  vault: "http://localhost:5174",
};

export const siteUrl = (key: SiteKey, path = ""): string =>
  (import.meta.env.DEV ? development : production)[key] + path;

/** Public navigation. The vault is deliberately absent: it has no public face. */
export const publicNav: { key: SiteKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "thoughts", label: "Thoughts" },
  { key: "library", label: "Library" },
  { key: "people", label: "People" },
];

export const contact = {
  email: "adarshsadanand79@gmail.com",
  github: "https://github.com/thealpha07",
  linkedin: "https://www.linkedin.com/in/adarsh-sadanand/",
  location: "Bengaluru, India",
};
