import { useCallback, useLayoutEffect, useRef, type ClipboardEvent } from "react";
import { insertAtSelection, noteImageMarkdown, pastedImage } from "./noteImages";

/** Pasting an image into the note saves it and puts its markdown line where the caret was. */
export function useNoteImagePaste(
  value: string,
  onChange: (value: string) => void,
  onSaveImage: (image: Blob) => Promise<string | null>,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Saving takes a moment; the line goes into the note as it is by then.
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });

  const onPaste = useCallback((event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = pastedImage(event.clipboardData);
    if (!image) return;

    event.preventDefault();
    const { selectionStart, selectionEnd } = event.currentTarget;
    void onSaveImage(image).then((path) => {
      if (!path) return;
      const next = insertAtSelection(latest.current, selectionStart, selectionEnd, noteImageMarkdown(path));
      onChange(next.value);
      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(next.caret, next.caret);
      });
    });
  }, [onChange, onSaveImage]);

  return { textareaRef, onPaste };
}
