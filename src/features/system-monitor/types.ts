export type CpuSnapshot = {
  totalPercent: number;
  coreCount: number;
  corePercents: number[];
};

export type MemorySnapshot = {
  totalBytes: number;
  usedBytes: number;
  percent: number;
};

export type DiskDriveSnapshot = {
  mountPoint: string;
  name: string;
  totalBytes: number;
  availableBytes: number;
  usedPercent: number;
};

export type DiskSnapshot = {
  drives: DiskDriveSnapshot[];
  readBytesPerSec: number;
  writeBytesPerSec: number;
};

export type NetworkSnapshot = {
  rxBytesPerSec: number;
  txBytesPerSec: number;
  totalRxBytes: number;
  totalTxBytes: number;
};

export type WifiSnapshot = {
  connected: boolean;
  ssid: string | null;
  signalPercent: number;
  linkSpeedMbps: number;
  phyType: string | null;
  isEthernetFallback: boolean;
};

export type BatterySnapshot = {
  hasBattery: boolean;
  isCharging: boolean;
  isPluggedIn: boolean;
  percent: number;
  remainingSeconds: number | null;
};

export type SystemSnapshot = {
  cpu: CpuSnapshot;
  memory: MemorySnapshot;
  disk: DiskSnapshot;
  network: NetworkSnapshot;
  wifi: WifiSnapshot;
  battery: BatterySnapshot | null;
  uptimeSeconds: number;
};

export type RefreshIntervalChoice = 1 | 2 | 5;
export type NetworkSpeedUnit = "bytes" | "bits";
export type CollapsedChipStyle = "text" | "ring";

export type SystemSettings = {
  enabled: boolean;
  refreshIntervalSeconds: RefreshIntervalChoice;
  networkSpeedUnit: NetworkSpeedUnit;
  showCollapsedChip: boolean;
  collapsedChipStyle: CollapsedChipStyle;
  showCpu: boolean;
  showMemory: boolean;
  showDisk: boolean;
  showNetwork: boolean;
  showWifi: boolean;
  /** The volume and brightness sliders at the top of the System page. */
  showQuickControls: boolean;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  enabled: true,
  refreshIntervalSeconds: 2,
  networkSpeedUnit: "bytes",
  showCollapsedChip: false,
  collapsedChipStyle: "text",
  showCpu: true,
  showMemory: true,
  showDisk: true,
  showNetwork: true,
  showWifi: true,
  showQuickControls: true,
};
