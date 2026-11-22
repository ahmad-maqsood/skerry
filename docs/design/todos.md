# Todos

- Todo rotation is disabled by default. When enabled, clicking "Start" in the expanded panel keeps the panel expanded and allows starting multiple items; the collapsed island rotates through all started, unfinished tasks in list order, removing "rotation count". Transitions reuse the message slide-in / slide-out vertical animation; scrolling uses single-line continuous upward loop cycling with a speed slider ranging from 10 to 40 px/s. Each item is timed independently, and the title switches/scrolls together with its countdown pill, reusing the original countdown pill. The island height remains unchanged, and automatic width is fixed based on the widest candidate title plus reserved timer space; when reduce motion is enabled, scrolling halts and displays the first item. Rotation is paused during message previews, expansion, and tucking. (
- When rotation is enabled, clicking the stop button at the start position stops only that item; completing or deleting also cleans up only that item. Disabling rotation preserves the primary task that was started first and stops the rest; subsequent behavior restores original single-task replacement and collapsing upon start. (Preserving the primary task when disabling rotation was an Agent implementation decision)

See [DESIGN.md](../../DESIGN.md) for global directions.

## Daily Markdown Reverse Sync 

- Settings -> Todos -> Save Path adds "Sync file edits back to the island", disabled by default; description indicates that editing the current day's Markdown externally will update the island todos and daily notes accordingly. Disabled when no folder path is saved, with a prompt to save a path first. Reuses settings toggle rows and existing line-wrapping layout. (
- When disabled, standard one-way export is used. When enabled, checks the current date file every 1.5 seconds, importing only after two consecutive stable versions; switches monitored file upon day rollover or save path change. Polling state resides in memory, causing no redundant window re-renders without changes. (
- The leading list in the file determines task titles, checkmarks, and order; supports `-` / `*` / `+`, uppercase/lowercase X, indentations, empty lines, and plain lists without checkboxes. Everything after the first body paragraph belongs to the daily note. Since existing exports have no dedicated note marker, pure list notes have inherent ambiguity with todos; notes must begin with body text or a heading (e.g. `## Notes`). (Agent inference; preserves original export format)
- Titles are first matched exactly, with duplicate titles resolved by closest position; when remaining row counts match, renames are inferred by remaining positions to preserve IDs, creation times, active timers, and hidden fields. New lines create new IDs; lines deleted in the file are deleted; system update todos and upcoming scheduled lists do not participate in import. (
- When title input is open, note or new item input is focused, or during dragging, import and disk writing are deferred, merging with committed contents upon completion. Empty files, incomplete checkboxes, corrupted encoding, or temporarily moved files never wipe island data, nor are they overwritten by auto-save. (
- Concurrent edits use the last common content for a three-way merge, preserving independent changes. Same-field or delete/rename conflicts are decided by the island last-edited timestamp versus file modification timestamp; two recovery copies `YYYY-MM-DD.conflict-<timestamp>-island.md` / `-file.md` are left in the folder before writing. New version writes use version comparisons and Windows exclusive write/replace protection, waiting to re-read on comparison failures. (
- Shortening valid Markdown is not directly judged as truncation, otherwise line deletion cannot be supported; two stable samples and syntax protection only identify temporary empty files and structural corruption, unable to distinguish between intentional deletion and a long-lingering valid prefix. (Agent inference, limitation of preserving original format)

English: File sync is off by default and requires a saved folder. When enabled, edits to today's Markdown update the leading task list and daily note. Editing a title/note or dragging defers synchronization. Empty or malformed files never clear island data. Independent edits merge; a same-field conflict uses the newer document timestamp and keeps both versions in timestamped conflict files. A note made only of list items is ambiguous in the existing export format; start it with a heading or prose.

## Dark List

- Todos share the dark background with the island, removing paper background, horizontal lines, creases, and drop shadows; removes the left-side "Back to Today / Save / History" three buttons, continuing auto-save. 
- The list is laid out directly inside the island, using subtle divider lines, light text, and transparent icon actions; input and edit areas retain low-contrast background, and completed items are muted with strikethrough. (Agent inference)
- Today's notes and the upcoming list use the same dark text, input, scrollbar, and focus styles; existing archive data and save formats remain compatible. (Agent inference)

## Todo Dates

- A date button sits to the right of the todo input box (default "Today"), opening an in-island calendar popup to select dates (using a custom-rendered React popup instead of native calendar controls to prevent stealing focus and causing island blur collapse or being covered by the always-on-top island); selecting a date after today turns the button purple, and pressing Enter routes the todo to "Upcoming" instead of appearing in today's list, resetting the date to today. (Upstream issue #30, user confirmed; 2026-11-15 custom calendar popup and expanded island height expansion / focus suppression)
- The popup renders inside the todo panel. While open, the expanded island automatically expands to at least 440px to ensure full display without clipping; while open, hover-out collapse, blur collapse, idle collapse, and hover focus restoration are suppressed. Clicking outside or pressing Esc closes it, restoring island height and collapse behavior. Supports previous/next month switching, today highlighting, selected date highlighting, clearing date, arrow key navigation, and week start and month names follow i18n language.
- When upcoming todos exist, a calendar button with a count badge appears beside the title, navigating to the "Upcoming" page grouped by date to view and delete; this page uses the archive page's fixed height and hides the input box. (Agent inference)
- Due todos (dates not later than today, including those missed while the app was closed) are merged to the top when the list represents today; when the list still stays on a previous day, merges only after day-rollover finishes archiving the old list, avoiding archiving into the old date. (Agent inference)

## Copywriting

- Labels, dates, and accessibility copywriting on the todo page follow the interface language. (Agent inference)

## Update Prompts (

- When a derived update todo appears and is not hidden, a 6px solid system red dot is displayed at the top right of the todo entry on the top bar of the expanded island; both icon and capsule entries retain original dimensions. After truly expanding and entering the todo page, it is remembered as viewed per version; collapsing while the remembered page is todo does not count as viewed. The prompt reappears on the next version and does not show when the update todo is hidden.
- When the update button on the update entry is clickable, a 5px solid red dot is always kept at the top right; disappears during download and installation, and reappears when download completes and is clickable. Reuses current "Update" text and button dimensions. Both red dots reuse `--color-badge` with no border, glow, or pulse, and are not focused separately; accessible name on the button supplements "New version available".

## Ordering

- "Drag to reorder" (`enableTodoReorder`) is enabled by default, auto-saving after dragging the right-side handle. Legacy settings without `todoReorderVersion: 1` are migrated to enabled; saved toggle value is respected only when tagged.
- After the handle moves 4px, the row lifts and follows the pointer, yielding in real time when crossing other row midlines using an approximately 200ms FLIP animation. Saves upon release; Esc / pointercancel restores original order; reduce motion skips yielding and drop animations. Edges 24px above and below the scrolling list auto-scroll. 

## Start and Countdown (issue #52)

- Settings -> Todos adds "Pomodoro" (`todoTimerEnabled`, disabled by default). The following duration picker, countdown, and due notifications are only enabled when turned on; clicking start directly starts/stops when disabled. Disabling immediately clears the current countdown round while preserving ongoing tasks; re-enabling does not restore previous rounds.
- When enabled, a watch icon (lucide `Timer`, 22px circular transparent button, accent color when active) sits to the left of "Start". "Start" only starts the task without countdown; only ▶ inside the watch settings starts the countdown (. Each todo item tracks its own duration, new todos start at 15 minutes, modifying one does not affect others; "unlimited time" is discontinued. Clicking the watch pops up a small time picker above it: a dark capsule containing an in-island stepper (26px, -/+ by 5 minutes, 1-240), "min", and an accent circular ▶. Rendered on the stage rather than in the todo row so the scrolling list cannot clip it; repositions below if there is no space above. Changes are remembered immediately; Esc / clicking outside / scrolling closes it. (User concept 2026-11-12: the previous "split capsule + large card" was discarded as unsightly)
- When rotation is disabled, the island collapses after starting and maintains a single ongoing todo; when enabled, it remains expanded and supports multiple items. The collapsed island displays task title + `mm:ss` inside a small capsule (18px high, light background, 12px 600 weight, truncating titles with ellipsis without compressing capsule); the start button position in the list displays a stop icon and `mm:ss` (shows minutes beyond one hour, e.g. `240:00`). (User concept)
- Time settings and timeout actions reuse existing dark, accent, and keyboard focus styles; per-second digits refresh only within the countdown leaf component. (Agent inference)
- When time expires, keeps task unfinished status and shows "Time's up / Complete / Another round". Complete checks off the task; another round restarts using that item's duration, keeping expanded when rotation is enabled. Stop, complete, and delete affect only that item; when rotation is disabled, starting another item cancels the old countdown. Does not repeatedly chime without interaction. (
- Timeout action area fades in briefly and stays static after appearance; does not animate when reduce motion is enabled. See [island.md](island.md) for conventions on timeout expansion, edge tucking, and tray hiding. (Agent inference)

English: With the timer on, a watch icon sits left of Start. Start only starts the task; the watch opens a small setter with -/+ in steps of 5 (1-240, initially 15 min) and a timed start button. Rotation is off by default. When enabled, Start keeps the island expanded and adds a task to the running set. The collapsed island switches or scrolls through all started tasks, each with its own countdown pill. Stopping, completing or deleting affects only that task. Another round reuses its duration. Turning rotation off retains the primary task and restores the original single-task behavior.

## Dimensions

## Before-End Reminder 

- Settings -> Todos -> Pomodoro adds "Before-end reminder", disabled by default; when enabled, an independent "Play sound on reminder" toggle is shown, disabled by default. Disabling reminders cancels advance reminders and alerts for the current round while preserving the countdown. (
- The watch's small time picker keeps existing timer stepper and start button; when reminders are enabled, adds a bell and an independent stepper for "minutes ahead". 0 means no reminder, selectable from 1-60 minutes and must be less than current total duration; initial selection defaults to 5 minutes, subsequent selections reuse the last actual choice. Controls remain within clickable bounds of the island, with no horizontal overflow. (
- Upon reaching the threshold, reminders fire only once per round, saving `reminded` before alerting. No toast text is shown (, countdown turns red, and tuck strip, rotation, and scrolling todos also display their own red countdown capsule; chimes three times when sound is enabled (`idle.wav`, 650ms intervals). When reduce motion is enabled, retains static alert color and halts flashing. (
- Advance reminder sounds do not play in game quiet mode and are not replayed upon exiting games; rounds that have already reached threshold remain recorded as reminded. Alerts clear upon finishing, stopping, completing, or deleting; restarting timers recalculates thresholds. Restarts restore deadline and reminded flag, avoiding duplicate alerts. Existing timeout reminder preserves original behavior. (

English: Before-end reminders and their optional sound are off by default. The timer picker can choose 0-60 minutes before the end, always shorter than the round. A reminder is persisted once and highlights that todo and its countdown in red, with no text line; with the sound on it chimes three times. Quiet game mode suppresses the sound without replaying it later.

## Dimensions

- The todo page is more compact : one todo row is 32px (previously 38px), row gap 6px; checkbox 20px, start / delete / drag buttons 22px high; input box 32px (previously 36px); notebook vertical padding 12px (previously 18 / 16), tab bar 22px, block gap 8px. With two rows, expanded island height is 258px (previously 306px), each additional row adds 38px (previously 46px), so under the default 490px maximum panel height, 8 rows can fit before scrolling (previously 6 rows). Notes page has one row margin at 296px; archive, review, and upcoming fixed heights remain unchanged. Height constants reside in `windows/island/layout.ts`, matching `TodoNotebook.css` and `TodoListItem.css`. (Agent inference: specific values)
- Corner radius in todos is one step smaller than other cards in the island (, input box, and daily notes use `--corner-xs`, row checkboxes, drag handles, and title inputs use `--corner-xs`, date button uses `--corner-sm`.
- In-place editing of todo titles : edit box is a multiline area expanding with content, preserving original line count and full text visibility, with text position aligned with pre-edit state; Enter saves, Shift+Enter does not insert newline (title remains single-paragraph, pasted newlines become spaces), IME Enter does not save, Esc cancels, leaving edit box saves. Implemented in `TodoTitleEditor.tsx`, regression page `tests/regression/todo-edit.html`.

## Todos / Notes / Calendar

- Top-left segmented control is Todos, Notes, Calendar in sequence. Past todos are viewed in Calendar. (User confirmed) Only active segment displays text, each segment has an accessible name, and the active indicator slides across switches.
- Top-right of the todo page uses a slender progress bar and "completed / total" to represent daily progress, updating immediately upon checkoff. (User confirmed) System update prompts and future scheduled items do not count toward daily progress; empty lists display `0/0`. (Agent inference)
- When upcoming todos exist, the calendar button beside progress navigates to the upcoming page. Date button is located next to todo input box.
- The last viewed view is remembered only during the current run (React state) and not written to storage.
- Implemented in `TodoViewSwitch.tsx`, `TodoNotebookTopline.tsx`.

## Calendar

- Left side is a compact monthly calendar, right side is todos for the selected date. The week starts on Monday, showing 4-6 weeks covering the full month. Today uses a solid accent circle, and selected dates use an outline.
- Days with todos display up to three dots below: unfinished and scheduled use accent color, completed use gray, unfinished sorted first.
- Arrows on both sides of the month switch months; right-side todos remain on selected date. "Today" jumps back to current month and selects today.
- An "Add todo" input box sits below headings for today and future dates. Pressing Enter places today's todos into today's list and future ones into "Upcoming". Upcoming todos use a purple dashed box, displaying a delete button on hover. Past dates read completion status from archives; unfinished items can be "Moved to today". When an unfinished item with the same name already exists today, the button indicates it has already been added.
- Calendar expanded height is 384px, constrained by maximum panel height. A six-week calendar displays completely at default height, and the right list can display approximately five single-line todos. (Agent inference: dimensions)
- Selected state has a short transition; lists fade in subtly when switching dates; switches directly when reduce motion is enabled. Regression page is `tests/regression/todo-history-calendar.html`.
