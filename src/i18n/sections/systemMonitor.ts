export type SystemMonitorText = {
  title: string;
  loading: string;
  cpu: {
    title: string;
    cores: (count: number) => string;
    showCores: string;
    hideCores: string;
  };
  memory: {
    title: string;
  };
  disk: {
    title: string;
  };
  network: {
    title: string;
    download: string;
    upload: string;
  };
  wifi: {
    title: string;
    ethernet: string;
    connected: string;
    disconnected: string;
    network: string;
    linkSpeed: string;
    protocol: string;
    unknownSpeed: string;
  };
  extras: {
    uptime: string;
    battery: string;
    charging: string;
    pluggedIn: string;
  };
  quickControls: {
    title: string;
    volume: string;
    brightness: string;
  };
  chipTooltip: (percent: string) => string;
};

export const en: SystemMonitorText = {
  title: "System",
  loading: "Loading system health...",
  cpu: {
    title: "Processor",
    cores: (count: number) => `${count} Cores`,
    showCores: "Details",
    hideCores: "Hide",
  },
  memory: {
    title: "Memory",
  },
  disk: {
    title: "Storage",
  },
  network: {
    title: "Network",
    download: "Download",
    upload: "Upload",
  },
  wifi: {
    title: "Wi-Fi",
    ethernet: "Ethernet",
    connected: "Connected",
    disconnected: "Disconnected",
    network: "Network",
    linkSpeed: "Link Speed",
    protocol: "Protocol",
    unknownSpeed: "Unknown",
  },
  extras: {
    uptime: "Uptime",
    battery: "Battery",
    charging: "Charging",
    pluggedIn: "Plugged in",
  },
  quickControls: {
    title: "Quick controls",
    volume: "Volume",
    brightness: "Brightness",
  },
  chipTooltip: (percent: string) => `CPU: ${percent}`,
};
