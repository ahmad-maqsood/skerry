# UI Design Guidelines

## Confirmed Directions

- Message area: generic Windows system notification feed, grouped by app with newest first. Action buttons align horizontally on the right side, continuing the existing dark, rounded-corner, and compact control aesthetic.
- Collapsed preview: shows app logo, title, and adaptive short body text. Clicking opens the corresponding application by AUMID.
- Appearance includes two settings: Color Theme (Dark / Light / Follow System, default Dark) and Material Texture. All four windows follow these settings together. Colors must use channels and semantic tokens in `tokens.css`; never hardcode white or dark backgrounds in components. Light mode is designed separately rather than as an inverted dark mode.
- Material Texture offers Graphite (default; it replaced Classic), Liquid Glass, Frosted Glass, Aurora, and Prism; glass dynamically blurs the screen behind the island.

## Branding and Components

- Reuse system fonts, Lucide action icons, corner radiuses, and light notification accents.
- Styles reuse component-scoped CSS; new semantic styles belong in the corresponding module.
- Preserve the back action during operations; provide in-place retry options on failure.

## Area Guidelines

Detailed design conventions are organized by area under `docs/design/`, so modifying one section avoids merge conflicts during parallel sessions:

- [Translation Window](docs/design/translation.md)
- [Skerry: Top-Edge Alignment and Visual Specifications](docs/design/island.md)
- [Settings](docs/design/settings.md)
- [Todos](docs/design/todos.md)
- [Notification Reading and Copying](docs/design/notifications.md)
- [Clipboard History](docs/design/clipboard.md)
- [File Shelf](docs/design/file-shelf.md)
- [Music Page](docs/design/music.md)
