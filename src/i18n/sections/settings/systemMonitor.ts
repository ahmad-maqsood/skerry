export type SettingsSystemMonitorText = {
  samplingGroup: string;
  refreshInterval: string;
  refreshIntervalDesc: string;
  interval1s: string;
  interval2s: string;
  interval5s: string;
  networkSpeedUnit: string;
  networkSpeedUnitDesc: string;
  unitBytes: string;
  unitBits: string;
  collapsedGroup: string;
  collapsedHint: string;
  showCollapsedChip: string;
  showCollapsedChipDesc: string;
  chipStyle: string;
  chipStyleDesc: string;
  chipStyleText: string;
  chipStyleRing: string;
  cardsGroup: string;
  showCpu: string;
  showMemory: string;
  showDisk: string;
  showNetwork: string;
  showWifi: string;
};

export const en: SettingsSystemMonitorText = {
  samplingGroup: "Sampling & Units",
  refreshInterval: "Refresh Interval",
  refreshIntervalDesc: "How often live metrics update when visible.",
  interval1s: "1s",
  interval2s: "2s",
  interval5s: "5s",
  networkSpeedUnit: "Network Speed Unit",
  networkSpeedUnitDesc: "Display download and upload speed in Bytes or bits.",
  unitBytes: "Bytes/s",
  unitBits: "Bits/s",
  collapsedGroup: "Collapsed Island",
  collapsedHint: "The collapsed CPU chip can also be dragged or arranged under Appearance → Layout.",
  showCollapsedChip: "Show in Collapsed Island",
  showCollapsedChipDesc: "Display live CPU usage when the island is collapsed.",
  chipStyle: "Display Style",
  chipStyleDesc: "Choose between glanceable text or a progress ring.",
  chipStyleText: "Text (CPU 24%)",
  chipStyleRing: "Ring",
  cardsGroup: "Visible Cards",
  showCpu: "Processor (CPU)",
  showMemory: "Memory (RAM)",
  showDisk: "Storage (Drives & I/O)",
  showNetwork: "Network Throughput",
  showWifi: "Wi-Fi & Connection",
};
