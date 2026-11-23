import { useCallback, type RefObject } from "react";
import { insertInline } from "./noteText";

/** Puts text into the note where the caret is, and leaves the caret after it. */
export function useNoteInsert(textareaRef: RefObject<HTMLTextAreaElement | null>, onChange: (value: string) => void) {
  return useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const next = insertInline(textarea.value, textarea.selectionStart, textarea.selectionEnd, text);
    onChange(next.value);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.caret, next.caret);
    });
  }, [onChange, textareaRef]);
}
