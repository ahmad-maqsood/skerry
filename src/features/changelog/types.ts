/** One published release, as the native side lists it (Rust: changelog/mod.rs ReleaseNote). */
export type ReleaseNote = {
  tag: string;
  name: string;
  body: string;
  /** ISO 8601, or empty when the release has no date. */
  publishedAt: string;
  url: string;
  prerelease: boolean;
};

/** What the page keeps between visits, so it can show the last list before (or without) the network. */
export type ReleaseNotesCache = { releases: ReleaseNote[]; fetchedAt: number };
