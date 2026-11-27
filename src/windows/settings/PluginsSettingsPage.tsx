import { useEffect, useState } from "react";
import { ArrowUpRight, Puzzle, ShieldCheck } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsChoice } from "../../components/settings/SettingsChoice";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { PROJECT_PLUGIN_SPEC_URL, pluginGuideUrl } from "../../features/updater/projectLinks";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { SettingsInput } from "../../components/settings/SettingsInput";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { PluginSettingRow } from "../../features/plugins/PluginSettingRow";
import { usePlugins, refreshPlugins } from "../../features/plugins/usePlugins";
import { usePluginPopupSettings } from "../../features/plugins/usePluginPopupSettings";
import { PLUGINS_ENABLED } from "../../features/plugins";
import { catalogSource, loadCatalog, saveCatalog } from "../../features/plugins/catalogCache";
import { configurePlugins, getPluginsIndex, installPlugin, loadDevelopmentPlugin, PLUGIN_INDEX_UNAVAILABLE, runPluginAction, setPluginEnabled, setPluginSetting, uninstallPlugin, type PluginIndexEntry } from "../../features/plugins/api";
import { useLocale, useTranslation } from "../../i18n";
import { PluginDevelopmentPage } from "./PluginDevelopmentPage";
import "./PluginsSettingsPage.css";

/** The external plugin host follows the release flag. */
export function PluginsSettingsPage() {
  return <div className="plugins-page">
    {PLUGINS_ENABLED ? <EnabledPluginsSettingsPage /> : <PluginDevelopmentPage />}
  </div>;
}

function EnabledPluginsSettingsPage() {
  const t = useTranslation().settings.plugins;
  const { locale } = useLocale();
  const { registry, live } = usePlugins();
  const popups = usePluginPopupSettings();
  // The last answer shows at once; the index is on the network and is read again behind it.
  const [stored, setStored] = useState(loadCatalog);
  const [error, setError] = useState("");
  const [section, setSection] = useState<"installed" | "available">("installed");
  const [busy, setBusy] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [directory, setDirectory] = useState("");
  const [index, setIndex] = useState<string | null>(null);
  const source = catalogSource(registry.developerMode, registry.indexUrl);
  const known = stored?.source === source ? stored : null;
  const catalog = known?.entries ?? [];
  const catalogUnavailable = known?.unavailable ?? false;
  // Installed plugins work without the index, so only installing waits for nothing but `busy`.
  const disabled = busy;
  const perform = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); await refreshPlugins(); }
    catch (e) {
      if (String(e) === PLUGIN_INDEX_UNAVAILABLE) setStored({ source, entries: [], unavailable: true });
      else setError(String(e));
    }
    finally { setBusy(false); }
  };
  const refreshCatalog = () => setCatalogRevision((revision) => revision + 1);
  useEffect(() => {
    let disposed = false;
    setCatalogLoading(true);
    const answer = (entries: PluginIndexEntry[], unavailable: boolean) => {
      if (disposed) return;
      const next = { source, entries, unavailable };
      setStored(next);
      saveCatalog(next);
    };
    void getPluginsIndex().then((entries) => answer(entries, false)).catch((e: unknown) => {
      console.error("Plugin index unavailable", e);
      answer([], true);
    }).finally(() => { if (!disposed) setCatalogLoading(false); });
    return () => { disposed = true; };
  }, [registry.developerMode, registry.indexUrl, source, catalogRevision]);
  const installed = Object.values(registry.installed);
  const available = catalog.filter((e) => !registry.installed[e.id]);
  const counted = (label: string, count: number) => count > 0 ? `${label} (${count})` : label;
  return <section className="settings-section settings-section--list plugins-settings">
    <div className="plugins-settings__toolbar">
      <SettingsChoice value={section} ariaLabel={t.sections} onChange={setSection} options={[
        { value: "installed", label: counted(t.installed, installed.length) },
        { value: "available", label: counted(t.available, available.length) },
      ]} />
      <SettingsLinkButton disabled={busy || catalogLoading} onClick={() => { void refreshCatalog(); }}>{t.retry}</SettingsLinkButton>
    </div>
    {section === "installed" && <SettingsGroup>
      {installed.length === 0 && <SettingsRow title={t.empty} control={<Puzzle size={18} aria-hidden="true" />} />}
      {installed.map((p) => <details key={p.manifest.id} className="plugins-settings__plugin">
        <summary>
          <span className="plugins-settings__plugin-name">{p.manifest.name[locale]}</span>
          <span className="plugins-settings__plugin-status">{t.status[live[p.manifest.id]?.status ?? "stopped"] ?? ""}</span>
        </summary>
        <SettingsRow title={t.version} description={p.manifest.version} control={<span className="plugins-settings__actions">
          {!p.development && <SettingsLinkButton ariaLabel={`${p.manifest.name[locale]} ${t.pluginGuide}`} onClick={() => { void openUrl(pluginGuideUrl(p.manifest.id)).catch(console.error); }}>{t.pluginGuide}</SettingsLinkButton>}
          {catalog.some((e) => e.id === p.manifest.id && e.version !== p.manifest.version) && <SettingsLinkButton disabled={disabled} onClick={() => { void perform(() => installPlugin(p.manifest.id)); }}>{t.update}</SettingsLinkButton>}
          <SettingsLinkButton disabled={disabled} onClick={() => { void perform(() => uninstallPlugin(p.manifest.id)); }}>{t.uninstall}</SettingsLinkButton>
        </span>} />
        <SettingsToggleRow title={t.enabled} checked={p.enabled} disabled={disabled} onChange={(enabled) => { void perform(() => setPluginEnabled(p.manifest.id, enabled)); }} />
        {p.manifest.contributes.includes("notifications") && <SettingsToggleRow title={t.popup} description={t.popupHint} checked={popups.isOn(p.manifest.id)} onChange={(on) => popups.setPopup(p.manifest.id, on)} />}
        <SettingsRow title={<span className="plugins-settings__permissions"><ShieldCheck size={14} aria-hidden="true" />{t.permissions}</span>} description={t.permissionsNotice}>
          <div className="plugins-settings__permissions">{p.manifest.permissions.map((permission) => <span key={permission} className="plugins-settings__permission">{t.permission[permission] ?? permission}</span>)}</div>
        </SettingsRow>
        {p.manifest.settings.map((s) => <PluginSettingRow key={`${p.manifest.id}/${s.key}/${JSON.stringify(p.settings[s.key])}`} setting={s} value={p.settings[s.key] ?? s.default} disabled={disabled} onSave={(value) => { void perform(() => setPluginSetting(p.manifest.id, s.key, value)); }} />)}
        {p.manifest.actions.map((action) => <SettingsRow key={action.id} title={action.label[locale]} control={<SettingsLinkButton disabled={disabled || !p.enabled} onClick={() => { void perform(() => runPluginAction(p.manifest.id, action.id)); }}>{action.label[locale]}</SettingsLinkButton>} />)}
      </details>)}
    </SettingsGroup>}
    {section === "available" && <>
      {available.length > 0 && <SettingsGroup footer={t.trustNotice}>
        {available.map((entry) => <SettingsRow key={entry.id} title={entry.name[locale]} description={entry.description[locale]} control={<SettingsLinkButton disabled={disabled} onClick={() => { void perform(() => installPlugin(entry.id)); }}>{t.install}</SettingsLinkButton>} />)}
      </SettingsGroup>}
      {!known && catalogLoading && <SettingsGroup><SettingsRow title={t.loading} control={<Puzzle size={18} aria-hidden="true" />} /></SettingsGroup>}
      {catalogUnavailable && <SettingsGroup><SettingsRow title={t.unavailable} control={<SettingsLinkButton disabled={busy || catalogLoading} onClick={() => { void refreshCatalog(); }}>{t.retry}</SettingsLinkButton>} /></SettingsGroup>}
      {/* Nothing to install is not a failed fetch: say whether the list is empty or all of it is installed. */}
      {known && !catalogUnavailable && available.length === 0 && <SettingsGroup>
        {catalog.length === 0
          ? <SettingsRow title={t.noneAvailable} control={<Puzzle size={18} aria-hidden="true" />} />
          : <SettingsRow title={t.allInstalled} description={t.allInstalledHint(catalog.map((entry) => entry.name[locale]).join(", "))}
              control={<SettingsLinkButton onClick={() => setSection("installed")}>{t.viewInstalled}</SettingsLinkButton>} />}
      </SettingsGroup>}
    </>}
    {error && <p className="plugins-settings__error" role="alert">{error}</p>}
    <details className="plugins-settings__developer"><summary>{t.developer}</summary><SettingsGroup>
      <SettingsToggleRow title={t.developerMode} checked={registry.developerMode} disabled={busy} onChange={(enabled) => { void perform(() => configurePlugins(enabled, registry.indexUrl)); }} />
      {registry.developerMode && <>
        <SettingsRow title={t.index} control={<SettingsLinkButton disabled={busy} onClick={() => { void perform(async () => { await configurePlugins(true, index ?? registry.indexUrl); setIndex(null); }); }}>{t.save}</SettingsLinkButton>}><SettingsInput aria-label={t.index} value={index ?? registry.indexUrl} onChange={(e) => setIndex(e.target.value)} /></SettingsRow>
        <SettingsRow title={t.directory} control={<SettingsLinkButton disabled={busy || !directory} onClick={() => { void perform(() => loadDevelopmentPlugin(directory)); }}>{t.load}</SettingsLinkButton>}><SettingsInput aria-label={t.directory} value={directory} onChange={(e) => setDirectory(e.target.value)} /></SettingsRow>
      </>}
      <SettingsRow title={t.develop} control={<SettingsLinkButton ariaLabel={t.develop} onClick={() => { void openUrl(PROJECT_PLUGIN_SPEC_URL).catch(console.error); }}><ArrowUpRight size={16} aria-hidden="true" /></SettingsLinkButton>} />
    </SettingsGroup></details>
  </section>;
}
