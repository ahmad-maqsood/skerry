import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { useTranslation } from "../../i18n";
import { findNoteImagePaths } from "./noteImages";
import { NoteImageViewer } from "./NoteImageViewer";
import "./DailyNoteImages.css";

/** Pictures shown under the note; the newest ones when it holds more. */
const MAX_THUMBNAILS = 12;

type Thumbnail = { path: string; url: string | null };

/** The picture to enlarge, and the island it is shown over. */
type Viewing = { url: string; host: Element };

function NoteThumbnail({
  path,
  onRead,
  onEnlarge,
}: {
  path: string;
  onRead: (relativePath: string) => Promise<string | null>;
  onEnlarge: (viewing: Viewing) => void;
}) {
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
        <button
          className="daily-note-images__open"
          type="button"
          aria-label={t.notebook.enlargeNoteImage}
          title={t.notebook.enlargeNoteImage}
          onClick={(event) => {
            const host = event.currentTarget.closest(".island") ?? document.body;
            onEnlarge({ url: current.url!, host });
          }}
        >
          <img src={current.url} alt={t.notebook.noteImage} draggable={false} />
        </button>
      ) : current ? (
        <ImageOff size={14} strokeWidth={2.2} aria-label={t.notebook.noteImageMissing} />
      ) : null}
    </div>
  );
}

/** The images the note refers to, as a row of pictures under the text; a click enlarges one. */
export function DailyNoteImages({
  note,
  onRead,
}: {
  note: string;
  onRead: (relativePath: string) => Promise<string | null>;
}) {
  const paths = useMemo(() => findNoteImagePaths(note).slice(-MAX_THUMBNAILS), [note]);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);

  if (paths.length === 0) return null;

  return (
    <>
      <div className="daily-note-images" role="list">
        {paths.map((path) => <NoteThumbnail key={path} path={path} onRead={onRead} onEnlarge={setViewing} />)}
      </div>
      {viewing && <NoteImageViewer url={viewing.url} host={viewing.host} onClose={closeViewer} />}
    </>
  );
}
