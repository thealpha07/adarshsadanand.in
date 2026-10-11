/** Dates as "11 Oct 2026", as the design system specifies. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Month precision for "since" dates: "Oct 2026". */
export function formatMonth(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** Plain words for the learning stages, shared by the homepage and the vault. */
export const learningStageLabel = { started: "Just started", practising: "Practising", applying: "Applying it" } as const;
