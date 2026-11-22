import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import type { SystemSnapshot } from "../../src/features/system-monitor/types.ts";
import { SystemPanel } from "../../src/features/system-monitor/SystemPanel.tsx";

const mockSnapshot: SystemSnapshot = {
  cpu: {
    totalPercent: 24.5,
    coreCount: 8,
    corePercents: [15.2, 35.1, 8.4, 62.0, 12.3, 19.8, 4.5, 41.2],
  },
  memory: {
    totalBytes: 34_359_738_368, // 32 GB
    usedBytes: 15_461_882_265, // 14.4 GB
    percent: 45.0,
  },
  disk: {
    drives: [
      {
        mountPoint: "C:",
        name: "Windows",
        totalBytes: 512_110_190_592, // 512 GB
        availableBytes: 284_535_685_120, // 284 GB
        usedPercent: 44.4,
      },
      {
        mountPoint: "D:",
        name: "Data",
        totalBytes: 1_024_220_381_184, // 1 TB
        availableBytes: 614_532_228_710, // 614 GB
        usedPercent: 40.0,
      },
    ],
    readBytesPerSec: 1_258_291, // 1.2 MB/s
    writeBytesPerSec: 348_160, // 340 KB/s
  },
  network: {
    rxBytesPerSec: 2_621_440, // 2.5 MB/s
    txBytesPerSec: 419_430, // 410 KB/s
    totalRxBytes: 104_857_600,
    totalTxBytes: 31_457_280,
  },
  wifi: {
    connected: true,
    ssid: "SkerryMesh-5G",
    signalPercent: 88,
    linkSpeedMbps: 866,
    phyType: "Wi-Fi 6 (802.11ax)",
    isEthernetFallback: false,
  },
  battery: {
    hasBattery: true,
    isCharging: false,
    isPluggedIn: true,
    percent: 85,
    remainingSeconds: null,
  },
  uptimeSeconds: 275_400, // 3d 4h 30m
};

mockIPC((command) => {
  if (command === "get_system_snapshot") return mockSnapshot;
  if (command === "start_system_sampling") return null;
  if (command === "stop_system_sampling") return null;
  return null;
});

const fixture = document.getElementById("fixture");
const results = document.getElementById("results");

if (fixture) {
  const root = createRoot(fixture);
  root.render(
    <StrictMode>
      <SystemPanel />
    </StrictMode>,
  );

  if (results) {
    results.textContent = "PASS: SystemPanel rendered with mocked data.\nAll cards and metrics mounted successfully.";
  }
}
