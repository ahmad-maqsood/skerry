import { invoke } from "@tauri-apps/api/core";
import { listen, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";
import type { SystemSnapshot } from "./types.ts";

export const SYSTEM_UPDATE_EVENT = "skerry-system-update";

export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  return invoke<SystemSnapshot>("get_system_snapshot");
}

export async function startSystemSampling(intervalSecs: number): Promise<void> {
  return invoke<void>("start_system_sampling", { intervalSecs });
}

export async function stopSystemSampling(): Promise<void> {
  return invoke<void>("stop_system_sampling");
}

export async function listenSystemUpdates(
  handler: EventCallback<SystemSnapshot>,
): Promise<UnlistenFn> {
  return listen<SystemSnapshot>(SYSTEM_UPDATE_EVENT, handler);
}
