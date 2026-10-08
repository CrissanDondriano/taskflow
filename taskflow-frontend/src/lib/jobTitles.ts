/**
 * Canonical workspace job titles. Mirrors App\Support\JobTitles::PRESETS on
 * the backend (kept in sync by hand — if you add a preset there, add it
 * here). Anything outside this list is still accepted as a custom title.
 */
export const JOB_TITLE_PRESETS = [
  "Designer",
  "Developer",
  "Accountant",
  "Project Manager",
  "Marketing",
  "QA",
  "Support",
] as const;

export type JobTitlePreset = (typeof JOB_TITLE_PRESETS)[number];

/** Display fallback for members with no title set (never persisted). */
export const UNTITLED = "Team member";
