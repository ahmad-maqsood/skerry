import { Channel, invoke } from "@tauri-apps/api/core";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import type { UpdateState } from "./updaterController";

export type UpdateRequest =
  | { action: "snapshot" | "check" | "install" | "dismiss" }
  | { action: "auto"; enabled: boolean };
const UPDATE_STATE_EVENT = "skerry-update-state";
const UPDATE_REQUEST_EVENT = "skerry-update-request";

export function listenUpdateState(callback: (state: UpdateState) => void) {
  return listen<UpdateState>(UPDATE_STATE_EVENT, (event) => callback(event.payload));
}

export function listenUpdateRequests(callback: (request: UpdateRequest) => void) {
  return listen<UpdateRequest>(UPDATE_REQUEST_EVENT, (event) => callback(event.payload));
}

export function publishUpdateState(state: UpdateState) {
  return emit(UPDATE_STATE_EVENT, state);
}

export function requestUpdateAction(request: UpdateRequest) {
  return emitTo("main", UPDATE_REQUEST_EVENT, request);
}

export function isUpdaterConfigured() {
  return invoke<boolean>("updater_configured");
}

/** True for the Microsoft Store version, which only the Store can update. */
export function isStoreBuild() {
  return invoke<boolean>("updater_store_build");
}

export function getUpdaterProxy() {
  return invoke<string | null>("get_updater_proxy");
}

/** Mirrors UpdateInfo in src-tauri/src/system/updater.rs. */
export type UpdateInfo = { version: string; body: string | null };

/** Mirrors DownloadEvent in src-tauri/src/system/updater.rs. */
export type DownloadEvent =
  | { event: "Started"; data: { contentLength: number | null } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

/**
 * Checks the updater endpoints for an update; any update found is kept natively for
 * download and install.
 */
export function checkUpdate(proxy: string | null) {
  return invoke<UpdateInfo | null>("updater_check", { proxy });
}

function eventChannel(onEvent: (event: DownloadEvent) => void) {
  const channel = new Channel<DownloadEvent>();
  channel.onmessage = onEvent;
  return channel;
}

/** Downloads the update the last check found, without installing it. */
export function downloadUpdate(onEvent: (event: DownloadEvent) => void) {
  return invoke<void>("updater_download", { onEvent: eventChannel(onEvent) });
}

/** Installs the update the last check found, downloading it first if needed. */
export function downloadAndInstallUpdate(onEvent: (event: DownloadEvent) => void) {
  return invoke<void>("updater_install", { onEvent: eventChannel(onEvent) });
}
