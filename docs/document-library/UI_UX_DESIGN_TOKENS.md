# Document Library UI/UX Design Tokens

## Principle

The Document Library must support both light and dark mode from the first implementation. Components should use semantic variables, not hard-coded light or dark colors.

The UI should stay simple and readable in both modes:

- calm surfaces,
- strong text contrast,
- clear status colors,
- restrained accents,
- no mode-specific one-off patches unless a component has a proven exception.

## Token Families

Use semantic tokens in the component layer:

| Token | Purpose |
| --- | --- |
| `--document-bg` | page background |
| `--document-surface` | main panels and packet rows |
| `--document-surface-soft` | subtle nested areas |
| `--document-surface-raised` | selected packet/detail panels |
| `--document-line` | ordinary borders |
| `--document-line-strong` | selected/active borders |
| `--document-text` | primary text |
| `--document-muted` | secondary text |
| `--document-faint` | helper text and disabled copy |
| `--document-accent` | primary action and active navigation |
| `--document-accent-soft` | active row background |
| `--document-success` | accepted/ready |
| `--document-success-soft` | accepted/ready badge background |
| `--document-warning` | missing/in review/needs attention |
| `--document-warning-soft` | warning badge background |
| `--document-danger` | rejected/blocked |
| `--document-danger-soft` | rejected/blocked badge background |
| `--document-info` | received/source/reference |
| `--document-info-soft` | received/source/reference badge background |

## Light Mode Intent

Light mode should feel comfortable for long office use:

- warm white page background,
- soft blue-gray surfaces,
- navy text,
- gentle borders,
- strong but not harsh blue action buttons,
- green/amber/red status badges that are readable but not loud.

## Dark Mode Intent

Dark mode should match the existing Dispatch Board operations style:

- dark navy page background,
- muted navy panels,
- bright readable text,
- blue active accents,
- green/amber/red status badges with enough contrast,
- no white escaped islands.

## Component Rules

Use tokens for:

- page background,
- packet rows,
- selected rows,
- category tiles,
- document requirement rows,
- review panel,
- search fields,
- buttons,
- badges,
- icons,
- borders,
- empty states,
- disabled states.

Avoid:

- hard-coded `#fff` panels inside dark mode,
- hard-coded dark panels inside light mode,
- status colors that are only expressed by color without text,
- low-contrast gray text,
- one-off color fixes inside individual components.

## Status Mapping

| Status | Token |
| --- | --- |
| Missing | `--document-warning`, `--document-warning-soft` |
| Requested | `--document-info`, `--document-info-soft` |
| Received | `--document-info`, `--document-info-soft` |
| In Review | `--document-warning`, `--document-warning-soft` |
| Accepted | `--document-success`, `--document-success-soft` |
| Rejected | `--document-danger`, `--document-danger-soft` |
| Needs Correction | `--document-warning`, `--document-warning-soft` |
| Expired | `--document-danger`, `--document-danger-soft` |
| Archived | `--document-muted`, `--document-surface-soft` |
| On Hold | `--document-danger`, `--document-danger-soft` |

## Adoption Rule

The mockups are visual direction, not fixed color values. Implementation should map the approved look into semantic tokens so light and dark mode remain consistent as the UI grows.
