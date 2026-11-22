# File Shelf

Global direction see [DESIGN.md](../../DESIGN.md).

## File Shelf

- Dedicated "File Shelf" page, top capsule uses warm light gray (`#d8d6cf`, matching page preview in Settings -> Appearance), distinguishing from todo blue, music purple, clipboard pink; original mint green removed on 2026-11-11 after . Mint green is no longer used on the page, see "No More Green" below. (User confirmed: dedicated page; dot color by Agent inference)
- Stores paths only without copying files; dragging out copies to destination by default, retaining entries on the island for repeated drags; Shift remains move, matching File Explorer. Legacy "remove after drag out" option updated to retain. (, 2026-11-10)
- On drag-in, list stays in place and dims, whole panel overlaid with dashed mint green layer; empty list drop target fills panel. After dropping, list returns to top, newly added items highlight for approx 1 second; when all items already exist, prompts briefly beside title "Already in list". (User confirmed: overlay approach)
- Selected items use mint green background and stroke; when two or more are selected, selection bar appears below title. Pinned items add a mint green stroke ring around icon; "Expired" strikes through filename, "Inaccessible" uses amber text without strikethrough, indicating file may still exist. (Agent inference)
- Collapsed count badge is a mint green pill, disabled by default. (User confirmed: wanted this setting; default off by Agent inference)
- (Superseded by tile layout below starting 2026-11-10) Items are flat rows on the panel, no longer row cards: background appears only on hover, selection, or drop. Left 40px icon slot: thumbnails for images, File Explorer system icons for others (borderless, with slight shadow); falls back to type-colored icon backgrounds when system icon is unavailable (folder yellow, document blue, spreadsheet green, presentation orange, archive amber, audio purple, video pink, code cyan, executable blue-violet). Subtitle shows "PDF · 1.4 MB", folders and expired states as before. (Agent inference, 2026-11-09 referencing modern shelf ideas, without using external code or assets)
- Copy, show in folder, pin, and remove buttons appear on hover, keyboard focus, or row selection; pinned items always display pin button. Icons elevate 1px on hover. (Agent inference)
- Newly dropped items slide in from top with brief mint green glow. Drag-in overlay features center mint green glow and dashed box, arrow gently floating up and down; empty list displays inbox icon, prompt, and note: "Remembers locations only, does not copy files; removing will not delete the original file". (Agent inference)
- Details see `docs/file-shelf.md`.

## Tile Layout 

First version had 4 tiles per row, two-line names, action buttons floating on tile top edge, page height 315px for one row, 463px for two rows.

## Redesign 

Overall: quiet, letting colors of files themselves take center stage. Panel uses same dark card as clipboard page, mint green reserved exclusively for shelf actions: pin, select, drag-in. (Agent inference, same below)

**Removed title bar and boxes inside panel** : panel top no longer has icon + "File Shelf" + count row; the page dot in the top bar already identifies the page. No boxes drawn inside panel: files normally have icon and name only, like desktop icons, with faint background appearing on hover or selection; "Can add more" empty slot has no dashed box, leaving faint plus and text only; empty state sits directly on panel without tray; drag-in no longer covers dashed drop zone, panel edge itself lighting up in mint green. Search box, hint, and clear button consolidated into bottom row (28px): search box on left when files are many, gray hint in middle (truncated when crowded, hover shows full text; briefly replaced by "Already in list"), clear on right; multi-select replaces entire row with "Selected N items" bar.

- **Dynamic layout based on count**: 1-4 files display as a single row of large tiles (48px thumbnail or system icon on top, filename single line, size below); when fewer than 4, end of row reserves an unboxed "Can add more" slot, indicating more files can be dragged in. 5 or more files switch to two compact columns of rows (28px icon, name, size), 44px per row, up to 5 rows visible, scrolling thereafter; search box appears in bottom row (hidden when few files). Layout follows total file count, not search results, avoiding re-layout while typing.
- **Icons**: images display thumbnails (continuous corners), other files display File Explorer system icons (`get_file_shelf_icon`, borderless); falls back to type-colored square backgrounds when unavailable (folder yellow, document blue, spreadsheet green, presentation orange, archive amber, audio purple, video pink, image apricot, code cyan, executable blue-violet). Expired, inaccessible items fade to translucent gray, fetching icons by type only without reading files.
- **Filenames**: single line only; middle-truncated when overflowing, preserving start and end, extension always fully visible and slightly dimmed ("IMG_2026…3522.jpg", "2026_Final).pdf"), measured against actual font and width (`fitFileStem` + `useFittedStem`), CJK truncated by character. Size line lists size only (extension already in name), folders show "Folder". Hover shows full path (`title`). Expired names struck through, inaccessible shows amber "Inaccessible" on size line (file may still exist).
- **Pinning**: small mint green pin at icon bottom-right, no longer stroking entire tile.
- **Dragging out**: cursor for tiles and rows is a grab hand, icon elevates 2px on hover with shadow as if pickable; pressing and dragging drags out (copies to destination by default, retained on island; Shift moves). Double-click opens file.
- **Actions**: pin, copy, show in folder, remove buttons appear on hover, keyboard focus, or selection. On tiles they replace the "size" line below the name without covering the icon; on rows they appear at right end, name re-truncating against remaining width without overlapping text. Remove button turns red on hover.
- **Multi-select**: when two or more, bottom row replaces with faint mint green "Selected N items" bar (copy, remove, cancel), preserving page height.
- **Drag-in**: list and bottom row recede (dim and slightly blur), panel edges light up in mint green (faint inner glow), center mint green circular download arrow (floating gently) with "Release mouse to add to File Shelf".
- **Empty state**: directly on panel, three fanned-out files on left (image, blank, document), right side: "Drag files onto the island to stash them here" and "Remembers locations only, does not copy files; removing will not delete the original file". On drag-in, panel edges glow mint green, side files fan out slightly more, center file becomes mint green down arrow.
- **Animations**: newly dropped files scale from 0.9x to 1.0x with a mint green flash ring (520ms); removed files fade and shrink (180ms) before leaving list. Instantly appear and disappear under reduced motion, skipping hover elevation.
- **Page height**: empty 244px, one row of tiles 226px (262px before 2026-11-19, see below), rows = 144 + row count * 50 - 6 (up to 5 rows, `getShelfExpandedHeight`), none exceeding maximum panel height.
- Collapsed island count badge retains mint green pill, unchanged.
- Corner radii: panel padding 12px, tile and row hover background radius uses "panel radius - 12px" (`--shelf-item-radius`), icons and thumbnails use continuous radii of `--corner-md` / `--corner-sm`.
- Inspection page: `tests/regression/file-shelf.html` (`?n=0|1|3|12` for counts, `&drop=1` for drag-in, `&lang=en` for English).

## No More Green 

Converted to island universal white / gray (`--color-text` hue 248, 246, 240, or `--text-1/2`, `--color-white-a*`), matching clipboard, music, and translation pages; references to "mint green" above apply here:

- Drag-in: panel edges glow with thin white line (0.5 opacity) plus faint inner white glow; center circular download arrow has near-white background, dark arrow, standard dark shadow; empty state drag-in center file likewise becomes near-white background with dark arrow, text uses `--text-1`.
- Selected item background and multi-select bottom "Selected N items" bar use faint white (`--color-white-a10` / `a08`); "Already in list" prompt uses `--text-1`.
- Pinned pushpin, copy success button: near-white background, dark icon; pinned button uses `--text-1` when active. Newly dropped files flash faint white ring.
- Collapsed island file count pill: text `--text-2`, background `--color-white-a10`, hover `--color-white-a18`.
- Liquid glass material file page accent color converted to neutral white, no longer showing green tint.
- Unchanged: top bar page dots (dots distinguish pages only, like clipboard), type-colored icon backgrounds (file's own color), keyboard focus ring (global `--color-focus-ring`), amber "Inaccessible", red on remove hover. (Agent inference)

**Removed bottom hint** : bottom row no longer displays gray hint "Drag out to copy, keep in list · Shift to move · Double-click to open"; center space displays "Already in list" briefly only when dragging in existing files.

**No bottom row for single tile row** : 1-4 files show tile row only (height 226px, formerly 262px), clear button floats at panel bottom-right (to the right of last tile name and action buttons, without covering text); "Already in list" appears as a small pill to its left, multi-select bar floats at bottom center. Row layouts with 5 or more files retain bottom row as before (search, hint, clear).
