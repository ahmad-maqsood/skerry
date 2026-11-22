import type { NetworkSpeedUnit } from "./types.ts";

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  if (i === 0) return `${Math.round(bytes)} B`;
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(decimals)} ${units[i]}`;
}

export function formatRate(bytesPerSec: number, unit: NetworkSpeedUnit = "bytes"): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) {
    return unit === "bytes" ? "0 KB/s" : "0 Kbps";
  }

  if (unit === "bytes") {
    if (bytesPerSec < 1024) {
      return `${Math.round(bytesPerSec)} B/s`;
    }
    if (bytesPerSec < 1024 * 1024) {
      return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
    }
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }

  const bitsPerSec = bytesPerSec * 8;
  if (bitsPerSec < 1000) {
    return `${Math.round(bitsPerSec)} bps`;
  }
  if (bitsPerSec < 1_000_000) {
    return `${(bitsPerSec / 1000).toFixed(1)} Kbps`;
  }
  return `${(bitsPerSec / 1_000_000).toFixed(1)} Mbps`;
}

export function formatPercent(percent: number): string {
  if (!Number.isFinite(percent)) return "0%";
  return `${Math.min(100, Math.max(0, Math.round(percent)))}%`;
}

export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatBatteryTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
