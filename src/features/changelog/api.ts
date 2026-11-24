import { invoke } from "@tauri-apps/api/core";
import type { ReleaseNote } from "./types";

/** The latest published releases of the project, newest first. Rust: changelog/mod.rs fetch_release_notes. */
export function fetchReleaseNotes(): Promise<ReleaseNote[]> {
  return invoke("fetch_release_notes");
}
