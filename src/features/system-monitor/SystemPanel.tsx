import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Battery,
  BatteryCharging,
  Cable,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useTranslation } from "../../i18n";
import {
  formatBatteryTime,
  formatBytes,
  formatPercent,
  formatRate,
  formatUptime,
} from "./formatters.ts";
import { QuickControls } from "../quick-controls";
import { Sparkline } from "./Sparkline.tsx";
import { useSystemMonitor } from "./useSystemMonitor.ts";
import "./SystemPanel.css";

export function SystemPanel(): ReactNode {
  const t = useTranslation().systemMonitor;
  const { snapshot, settings, cpuHistory, memoryHistory, downloadHistory, uploadHistory } =
    useSystemMonitor(true);
  const [showCores, setShowCores] = useState(false);

  if (!snapshot) {
    return (
      <div className="system-panel">
        <div className="system-card system-card--full">
          <div className="system-card__header">
            <span className="system-card__title-box">
              <Activity size={14} />
              {t.loading}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { cpu, memory, disk, network, wifi, battery, uptimeSeconds } = snapshot;
  const speedUnit = settings.networkSpeedUnit;
  const tickMs = settings.refreshIntervalSeconds * 1000;

  return (
    <div className="system-panel">
      <div className="system-panel__grid">
        {settings.showQuickControls && <QuickControls />}

        {/* 1. CPU Card */}
        {settings.showCpu && (
          <div className="system-card">
            <div className="system-card__header">
              <div className="system-card__title-box">
                <Cpu size={14} />
                <span>{t.cpu.title}</span>
              </div>
              <span className="system-card__badge">{t.cpu.cores(cpu.coreCount)}</span>
            </div>

            <div className="system-card__value-row">
              <span className="system-card__primary-val">{formatPercent(cpu.totalPercent)}</span>
              <button
                type="button"
                className="system-card__toggle-btn"
                onClick={() => setShowCores((prev) => !prev)}
                aria-expanded={showCores}
              >
                <span>{showCores ? t.cpu.hideCores : t.cpu.showCores}</span>
                {showCores ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            <Sparkline data={cpuHistory} max={100} height={34} tickMs={tickMs} />

            {showCores && (
              <div className="system-card__cores-grid">
                {cpu.corePercents.map((val, idx) => (
                  <div key={idx} className="system-card__core-item">
                    <span>{idx + 1}: {Math.round(val)}%</span>
                    <div className="system-card__core-bar">
                      <div
                        className="system-card__core-fill"
                        style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Memory Card */}
        {settings.showMemory && (
          <div className="system-card">
            <div className="system-card__header">
              <div className="system-card__title-box">
                <HardDrive size={14} />
                <span>{t.memory.title}</span>
              </div>
              <span className="system-card__badge">{formatPercent(memory.percent)}</span>
            </div>

            <div className="system-card__value-row">
              <span className="system-card__primary-val">{formatPercent(memory.percent)}</span>
              <span className="system-card__secondary-val">
                {formatBytes(memory.usedBytes)} / {formatBytes(memory.totalBytes)}
              </span>
            </div>

            <Sparkline data={memoryHistory} max={100} height={34} tickMs={tickMs} />

            <div className="system-card__progress-track">
              <div
                className="system-card__progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, memory.percent))}%` }}
              />
            </div>
          </div>
        )}

        {/* 3. Disk Card */}
        {settings.showDisk && (
          <div className="system-card">
            <div className="system-card__header">
              <div className="system-card__title-box">
                <Database size={14} />
                <span>{t.disk.title}</span>
              </div>
              <div className="system-card__secondary-val">
                R: {formatRate(disk.readBytesPerSec, "bytes")} · W: {formatRate(disk.writeBytesPerSec, "bytes")}
              </div>
            </div>

            <div className="system-card__drives-list">
              {disk.drives.map((drive) => (
                <div key={drive.mountPoint} className="system-card__drive-row">
                  <div className="system-card__drive-info">
                    <span>{drive.mountPoint} ({drive.name})</span>
                    <span className="system-card__drive-cap">
                      {formatBytes(drive.totalBytes - drive.availableBytes)} / {formatBytes(drive.totalBytes)} ({Math.round(drive.usedPercent)}%)
                    </span>
                  </div>
                  <div className="system-card__progress-track">
                    <div
                      className="system-card__progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, drive.usedPercent))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Network Card */}
        {settings.showNetwork && (
          <div className="system-card">
            <div className="system-card__header">
              <div className="system-card__title-box">
                <Activity size={14} />
                <span>{t.network.title}</span>
              </div>
            </div>

            <div className="system-card__network-split">
              <div className="system-card__net-stream">
                <div className="system-card__net-label">
                  <ArrowDown size={11} />
                  <span>{t.network.download}</span>
                </div>
                <span className="system-card__net-val">
                  {formatRate(network.rxBytesPerSec, speedUnit)}
                </span>
                <Sparkline data={downloadHistory} height={26} tickMs={tickMs} />
              </div>

              <div className="system-card__net-stream">
                <div className="system-card__net-label">
                  <ArrowUp size={11} />
                  <span>{t.network.upload}</span>
                </div>
                <span className="system-card__net-val">
                  {formatRate(network.txBytesPerSec, speedUnit)}
                </span>
                <Sparkline
                  data={uploadHistory}
                  height={26}
                  tickMs={tickMs}
                  color="var(--island-accent-2, #a78bfa)"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Wi-Fi / Connection Card */}
        {settings.showWifi && (
          <div className="system-card system-card--full">
            <div className="system-card__header">
              <div className="system-card__title-box">
                {wifi.connected ? (
                  wifi.isEthernetFallback ? <Cable size={14} /> : <Wifi size={14} />
                ) : (
                  <WifiOff size={14} />
                )}
                <span>{wifi.isEthernetFallback ? t.wifi.ethernet : t.wifi.title}</span>
              </div>
              {wifi.connected && !wifi.isEthernetFallback && (
                <div className="system-signal-bars" title={`${wifi.signalPercent}%`}>
                  {[25, 50, 75, 100].map((threshold, barIdx) => (
                    <div
                      key={barIdx}
                      className={`system-signal-bar ${
                        wifi.signalPercent >= threshold ? "system-signal-bar--active" : ""
                      }`}
                      style={{ height: `${(barIdx + 1) * 3}px` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="system-card__wifi-details">
              <div className="system-card__wifi-row">
                <span className="system-card__wifi-label">{t.wifi.network}</span>
                <span className="system-card__wifi-val">
                  {wifi.connected ? wifi.ssid ?? t.wifi.connected : t.wifi.disconnected}
                </span>
              </div>

              {wifi.connected && (
                <>
                  <div className="system-card__wifi-row">
                    <span className="system-card__wifi-label">{t.wifi.linkSpeed}</span>
                    <span className="system-card__wifi-val">
                      {wifi.linkSpeedMbps > 0 ? `${wifi.linkSpeedMbps} Mbps` : t.wifi.unknownSpeed}
                    </span>
                  </div>
                  {wifi.phyType && (
                    <div className="system-card__wifi-row">
                      <span className="system-card__wifi-label">{t.wifi.protocol}</span>
                      <span className="system-card__wifi-val">{wifi.phyType}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 6. Uptime & Battery Card */}
        <div className="system-card system-card--full">
          <div className="system-card__extras-row">
            <div className="system-card__extra-item">
              <Clock size={13} />
              <span>{t.extras.uptime}:</span>
              <span className="system-card__extra-bold">{formatUptime(uptimeSeconds)}</span>
            </div>

            {battery && battery.hasBattery && (
              <div className="system-card__extra-item">
                {battery.isCharging ? <BatteryCharging size={14} /> : <Battery size={14} />}
                <span>{t.extras.battery}:</span>
                <span className="system-card__extra-bold">
                  {battery.percent}%
                  {battery.isCharging
                    ? ` (${t.extras.charging})`
                    : battery.isPluggedIn
                    ? ` (${t.extras.pluggedIn})`
                    : battery.remainingSeconds
                    ? ` (${formatBatteryTime(battery.remainingSeconds)})`
                    : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
