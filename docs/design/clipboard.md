# Clipboard History

Global direction see [DESIGN.md](../../DESIGN.md).

## Flat List

- Removed nested box hierarchies, blending directly into the island's dark background. 
- Avoids drawing independent panel backgrounds, borders, or shadows; organizes records with subtle dividers, avoiding row cards. Text type icons, notes, favorites, and action buttons default to borderless backgrounds, while images retain compact thumbnails. (Agent inference)
- Retains All / Favorites, search, copy, note, and delete actions; favorites remain visible, while other actions appear on hover or keyboard row entry. Copy and delete confirmations retain status feedback. (Agent inference)
- Search box retains low-contrast background and visible focus, reserving sufficient width for input and confirm / cancel buttons during note editing; long content truncates within the row without squeezing action zones. (Agent inference)
- Search box placed to the right of "All / Favorites", sharing a single line with tabs; panel height reduced accordingly without empty search line whitespace. 
- Classic and glass appearances both use the island's own background directly, avoiding stacking another glass panel. Maintains 44px row height, 6px row spacing, and item-count height calculation rules. (Agent inference)

## Capacity and On-Island Height (

- History items range 5-500, default remains 30; in settings, "Max items to save" is followed immediately by "Visible rows when expanded", range 3-8, default 4, step 1. The latter determines on-island clipboard height only, without affecting saved count, and is not reset with appearance presets.
- List initially mounts 20 items, appending 20 more when scrolled within 200px of bottom; search and filters apply to entire dataset, re-displaying from first batch. Flat 44px rows without virtual list dependencies.

## Multi-Select and Preview (

- Header trash can enters selection mode: circular checkboxes on row left fade in, content shifts right in 180ms; clicking rows toggles selection without copying. Header select-all operates on current search and filter results only (including unmounted items), preserving hidden selections; delete button shows total selected count. Clicking trash can again deletes explicitly selected records, including favorites; exits on success, retains selections with inline prompt on failure.
- X or Esc exits selection without 3-second timeout; single-item deletion retains original double-click confirmation.
- Thumbnails serve as independent zoom triggers with zoom-in cursor; previews available in selection mode without altering selections. Images display in original aspect ratio over translucent overlay within panel, showing dimensions; expands thumbnail first on read, retaining placeholder with prompt on failure.
- Clicking overlay, close button, or Esc dismisses preview; preview consumes Esc first, followed by exiting selection, without triggering island collapse. 180ms fade-in with subtle scale, fading in only under reduced motion; focus remains in preview, restored on close.

## Detached Window (

- Settings -> Clipboard "Open clipboard in a separate window" disabled by default. When enabled, island clipboard entry and clipboard shortcut open detached window, no longer expanding on-island clipboard page.
- Window has no system chrome, matching island dark surface, continuous corners, and 1px subtle white stroke; default 420x640, resizable by edges, minimum 360x420, scaled to fit island screen, remembers last position.
- Draggable custom 40px title bar at top: top-left pin (lucide Pin / PinOff), highlighted in accent color and pinned on top when active, highest z-order not covered by other windows; default pinned, preference remembered. Top-right X closes.
- Houses identical clipboard panel (search, filter, multi-select delete, image preview, favorites, notes); list scrolls filling window, unrestricted by "Visible rows when expanded".



- Detached window note column adjusts with window width (at least 64px, up to 32% of window width or 280px), long notes no longer cut to 5 characters.
- Detached window adds "Close when clicking outside window" (default off, effective only when unpinned): closes only after 150ms blur without returning to window, avoiding accidental dismissal from transient menu blurs.
- Filter by type: three small icons to right of tabs (Text / Image / File), clicking active type reverts to All. Captures files copied from File Explorer (CF_HDROP), showing file icon at row start; copying back restores files to clipboard if files still exist, falling back to path text otherwise.
- Settings -> Clipboard -> Storage location: input box with folder button, selecting folder moves directory; supports typing path followed by "Move here", or "Restore default location". Copies first then switches, preserving data on failure.
