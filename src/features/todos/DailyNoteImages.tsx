import { useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { useTranslation } from "../../i18n";
import { findNoteImagePaths } from "./noteImages";
import "./DailyNoteImages.css";

/** Thumbnails shown under the note; the newest ones when it holds more. */
const MAX_THUMBNAILS = 12;

type Thumbnail = { path: string; url: string | null };

function NoteThumbnail({ path, onRead }: { path: string; onRead: (relativePath: string) => Promise<string | null> }) {
  const t = useTranslation();
  const [loaded, setLoaded] = useState<Thumbnail | null>(null);

  useEffect(() => {
    let cancelled = false;
    onRead(path)
      .then((url) => { if (!cancelled) setLoaded({ path, url }); })
      .catch(() => { if (!cancelled) setLoaded({ path, url: null }); });
    return () => { cancelled = true; };
  }, [onRead, path]);

  const current = loaded?.path === path ? loaded : null;

  return (
    <div className="daily-note-images__item" role="listitem">
      {current?.url ? (
        <img src={current.url} alt={t.notebook.noteImage} draggable={false} />
      ) : current ? (
        <ImageOff size={14} strokeWidth={2.2} aria-label={t.notebook.noteImageMissing} />
      ) : null}
    </div>
  );
}

/** The images the note refers to, as a row of small pictures under the text. */
export function DailyNoteImages({
  note,
  onRead,
}: {
  note: string;
  onRead: (relativePath: string) => Promise<string | null>;
}) {
  const paths = useMemo(() => findNoteImagePaths(note).slice(-MAX_THUMBNAILS), [note]);

  if (paths.length === 0) return null;

  return (
    <div className="daily-note-images" role="list">
      {paths.map((path) => <NoteThumbnail key={path} path={path} onRead={onRead} />)}
    </div>
  );
}
