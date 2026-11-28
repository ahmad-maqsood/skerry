import { LiveWallpaperSettingsSection } from "../../features/live-wallpaper/LiveWallpaperSettingsSection";
import { WidgetsSettingsSection } from "../../features/widgets/WidgetsSettingsSection";

/** Settings → Advanced: optional extras that cost resources, so each starts switched off. */
export function AdvancedSettingsPage() {
  return (
    <>
      <LiveWallpaperSettingsSection />
      <WidgetsSettingsSection />
    </>
  );
}
