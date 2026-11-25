import { Component, type ErrorInfo, type ReactNode } from "react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { useTranslation } from "../../i18n";

function PageErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const text = useTranslation().settings.pageError;
  return (
    <SettingsGroup>
      <SettingsRow
        title={<span role="alert">{text.title}</span>}
        description={error.message || text.fallbackHint}
        control={<SettingsLinkButton onClick={onRetry}>{text.retry}</SettingsLinkButton>}
      />
    </SettingsGroup>
  );
}

/**
 * Keeps one broken settings page from taking down the window: the sidebar and the title stay, and
 * the page shows an error with a retry. Give it key={category} so opening another page clears it.
 * React only supports error boundaries as classes; the fallback above is a normal component so it can
 * use the translations.
 */
export class SettingsErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // The diagnostic log mirrors console errors (features/diagnostics/appLogCapture.ts).
    console.error("A settings page failed to render", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    return <PageErrorFallback error={error} onRetry={() => this.setState({ error: null })} />;
  }
}
