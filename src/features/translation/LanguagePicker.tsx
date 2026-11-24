import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { useTranslation } from "../../i18n";
import { findTranslationLanguage, languageChoices } from "./languages";
import { DEFAULT_TARGET_LANGUAGE } from "./storage";
import "./LanguagePicker.css";

/**
 * Picks the language to translate into from a list that can be searched by English name, the
 * language's own name or its code. Keyboard: type to filter,
 * arrows move, Enter picks, Esc closes.
 */
export function LanguagePicker({
  value,
  disabled = false,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (code: string) => void;
}) {
  const t = useTranslation();
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const choices = useMemo(() => languageChoices(query), [query]);
  const label = findTranslationLanguage(value)?.name ?? findTranslationLanguage(DEFAULT_TARGET_LANGUAGE)?.name ?? "";
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    if (isOpen) searchRef.current?.focus({ preventScroll: true });
  }, [isOpen]);
  useEffect(() => {
    if (isOpen) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, choices, isOpen, listId]);

  const open = () => {
    setQuery("");
    setActiveIndex(Math.max(languageChoices("").findIndex((choice) => choice.code === value), 0));
    setIsOpen(true);
  };
  const choose = (index: number) => {
    const choice = choices[index];
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
    if (choice && choice.code !== value) onChange(choice.code);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => Math.min(Math.max(index + step, 0), Math.max(choices.length - 1, 0)));
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      // Closes the list only: Esc would otherwise also collapse the island or hide the window.
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <div
      className={`language-picker${isOpen ? " language-picker--open" : ""}`}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false); }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="language-picker__trigger"
        aria-label={`${t.translator.targetLanguage}: ${label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!isOpen) open(); }
        }}
      >
        <span>{label}</span>
        <ChevronDown className="language-picker__chevron" size={14} strokeWidth={2.2} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="language-picker__menu">
          <div className="language-picker__search">
            <Search size={13} aria-hidden="true" />
            <input
              ref={searchRef}
              className="language-picker__input"
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-autocomplete="list"
              aria-controls={choices.length > 0 ? listId : undefined}
              aria-activedescendant={choices.length > 0 ? optionId(activeIndex) : undefined}
              aria-label={t.translator.searchLanguages}
              placeholder={t.translator.searchLanguages}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
          {choices.length === 0 ? (
            <p className="language-picker__empty">{t.translator.noLanguageMatch}</p>
          ) : (
            // Pressing a row or the scrollbar must not take focus from the search box, whose blur closes the list.
            <ul id={listId} className="language-picker__list" role="listbox" aria-label={t.translator.targetLanguage} onMouseDown={(event) => event.preventDefault()}>
              {choices.map((choice, index) => (
                <li
                  key={choice.code}
                  id={optionId(index)}
                  className={`language-picker__option${index === activeIndex ? " language-picker__option--active" : ""}`}
                  role="option"
                  aria-selected={choice.code === value}
                  data-value={choice.code}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                >
                  <span className="language-picker__name">{choice.label}</span>
                  {choice.native && choice.native !== choice.label && <span className="language-picker__native" lang={choice.code}>{choice.native}</span>}
                  {choice.code === value && <Check size={14} strokeWidth={2.4} aria-hidden="true" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
