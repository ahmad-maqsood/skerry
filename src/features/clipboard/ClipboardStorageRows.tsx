import { useEffect, useRef, useState } from "react";
import { FolderOpen } from "lucide-react";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsInput } from "../../components/settings/SettingsInput";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { useTranslation } from "../../i18n";
import {
  clearClipboardHistory,
  getClipboardStorageDirectory,
  getClipboardStorageSize,
  openClipboardStorageFolder,
  pickClipboardStorageDirectory,
  setClipboardStorageDirectory,
  type ClipboardStorageInfo,
  type ClipboardStorageSize,
} from "./api";
import "./ClipboardStorageRows.css";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Settings → Clipboard → Storage: folder path, disk usage, open folder,
 * clear history, and unencrypted storage disclosure.
 */
export function ClipboardStorageRows({ recoveredFromBackup }: { recoveredFromBackup?: boolean }) {
  const t = useTranslation();
  const text = t.settings.clipboard;
  const [info, setInfo] = useState<ClipboardStorageInfo | null>(null);
  const [size, setSize] = useState<ClipboardStorageSize | null>(null);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"idle" | "moving" | "moved">("idle");
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearState, setClearState] = useState<"idle" | "clearing" | "cleared">("idle");
  const pickingRef = useRef(false);

  const refreshMetrics = async () => {
    try {
      const storageSize = await getClipboardStorageSize();
      setSize(storageSize);
    } catch {
      // Ignore background size refresh failure
    }
  };

  useEffect(() => {
    let didCancel = false;
    void getClipboardStorageDirectory()
      .then((next) => {
        if (!didCancel) {
          setInfo(next);
          setDraft(next.directory);
        }
      })
      .catch((failure) => {
        if (!didCancel) setError(String(failure));
      });

    void refreshMetrics();

    return () => {
      didCancel = true;
    };
  }, []);

  const move = async (directory: string) => {
    setState("moving");
    setError("");
    try {
      const next = await setClipboardStorageDirectory(directory);
      setInfo(next);
      setDraft(next.directory);
      setState("moved");
      void refreshMetrics();
    } catch (failure) {
      setError(String(failure));
      setState("idle");
    }
  };

  const choose = async () => {
    if (pickingRef.current) return;
    pickingRef.current = true;
    try {
      const picked = await pickClipboardStorageDirectory(draft, text.storageChoose);
      if (picked !== null) {
        setDraft(picked);
        await move(picked);
      }
    } catch (failure) {
      setError(String(failure));
    } finally {
      pickingRef.current = false;
    }
  };

  const openFolder = async () => {
    try {
      await openClipboardStorageFolder();
    } catch (failure) {
      setError(String(failure));
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }

    setClearState("clearing");
    try {
      await clearClipboardHistory();
      setConfirmClear(false);
      setClearState("cleared");
      void refreshMetrics();
    } catch (failure) {
      setError(String(failure));
      setClearState("idle");
    }
  };

  const unchanged = info !== null && draft.trim() === info.directory;
  const moving = state === "moving";

  const sizeDescription = size
    ? `${formatBytes(size.totalBytes)} (${size.itemsCount} entries, ${size.imagesCount} images)`
    : null;

  return (
    <SettingsGroup
      title={text.storageTitle}
      footer={
        <>
          <p>{text.storageHint}</p>
          <p className="clipboard-storage__notice">{text.storageUnencryptedNotice}</p>
        </>
      }
    >
      {recoveredFromBackup && (
        <div className="clipboard-storage__warning" role="alert">
          {text.recoveredNotice}
        </div>
      )}

      {sizeDescription && (
        <SettingsRow
          title={text.storageSizeLabel}
          control={
            <>
              <SettingsLinkButton onClick={() => void openFolder()}>{text.storageOpen}</SettingsLinkButton>
              {clearState === "cleared" ? (
                <span className="clipboard-storage__done">{text.storageClearDone}</span>
              ) : (
                <SettingsLinkButton
                  disabled={clearState === "clearing"}
                  onClick={() => void handleClear()}
                >
                  {confirmClear ? text.storageClearConfirm : text.storageClear}
                </SettingsLinkButton>
              )}
            </>
          }
        >
          <span className="clipboard-storage__size-text">{sizeDescription}</span>
        </SettingsRow>
      )}

      <SettingsRow
        title={text.storageFolder}
        control={
          <>
            {state === "moved" && unchanged ? (
              <span className="clipboard-storage__done">{text.storageMoved}</span>
            ) : (
              <SettingsLinkButton
                disabled={moving || unchanged || !draft.trim()}
                onClick={() => void move(draft)}
              >
                {moving ? text.storageMoving : text.storageMove}
              </SettingsLinkButton>
            )}
            {info && !info.isDefault && (
              <SettingsLinkButton disabled={moving} onClick={() => void move("")}>
                {text.storageReset}
              </SettingsLinkButton>
            )}
          </>
        }
      >
        <div className="clipboard-storage__field">
          <SettingsInput
            monospace
            value={draft}
            disabled={moving}
            aria-label={text.storageFolder}
            placeholder={info?.defaultDirectory}
            onChange={(event) => {
              setDraft(event.currentTarget.value);
              setState("idle");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !unchanged && draft.trim()) void move(draft);
            }}
          />
          <button
            type="button"
            className="clipboard-storage__browse"
            aria-label={text.storageChoose}
            title={text.storageChoose}
            disabled={moving}
            onClick={() => void choose()}
          >
            <FolderOpen size={17} aria-hidden="true" />
          </button>
        </div>
        {error && (
          <p className="clipboard-storage__error" role="alert">
            {error}
          </p>
        )}
      </SettingsRow>
    </SettingsGroup>
  );
}
