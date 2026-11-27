import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { SettingsInput } from "../../components/settings/SettingsInput";
import { useTranslation } from "../../i18n";
import { SETTINGS_CATEGORIES } from "./categories";
import { SETTINGS_SEARCH_INDEX } from "./searchIndex";
import { searchSettings, type SettingsSearchTarget } from "./searchSettings";
import "./SettingsSearch.css";

/**
 * The search box above the settings page list. While something is typed, the matching pages, groups
 * and settings replace the page list (`children`); picking one opens it and clears the box.
 */
export function SettingsSearch({ onJump, children }: { onJump: (target: SettingsSearchTarget) => void; children: ReactNode }) {
  const text = useTranslation().settings;
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const pages = useMemo(() => SETTINGS_CATEGORIES.map((page) => ({ page, label: text.categories[page] })), [text]);
  const results = useMemo(() => searchSettings(SETTINGS_SEARCH_INDEX, pages, query), [pages, query]);
  const searching = query.trim() !== "";

  const jump = (target: SettingsSearchTarget) => {
    setQuery("");
    onJump(target);
  };
  const resultButtons = () => [...(resultsRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && searching) {
      // The first Esc only clears the box; the island's own Esc (collapse) waits for the next one.
      event.preventDefault();
      event.stopPropagation();
      setQuery("");
    } else if (event.key === "Enter" && results[0]) {
      event.preventDefault();
      jump(results[0].target);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      resultButtons()[0]?.focus();
    }
  };
  const onResultKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const buttons = resultButtons();
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") buttons[Math.min(at + 1, buttons.length - 1)]?.focus();
    else if (event.key === "ArrowUp") (at <= 0 ? inputRef.current : buttons[at - 1])?.focus();
    else return;
    event.preventDefault();
  };

  return (
    <>
      <div className="settings-search">
        <SettingsInput
          ref={inputRef}
          className="settings-search__input"
          type="text"
          role="searchbox"
          aria-label={text.categories.search.label}
          placeholder={text.categories.search.placeholder}
          value={query}
          maxLength={60}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onInputKeyDown}
        />
      </div>
      {searching ? (
        <div className="settings-sidebar__list settings-search__list">
          <p className="settings-search__status" role="status" aria-live="polite">
            {results.length ? text.categories.search.found(results.length) : text.categories.search.none}
          </p>
          {results.length > 0 && (
            <ul className="settings-search__results" ref={resultsRef} onKeyDown={onResultKeyDown}>
              {results.map((result) => (
                <li key={result.key}>
                  <button type="button" className="settings-search__result" onClick={() => jump(result.target)}>
                    <span className="settings-search__label">{result.label}</span>
                    {result.where && <span className="settings-search__where">{result.where}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : children}
    </>
  );
}
