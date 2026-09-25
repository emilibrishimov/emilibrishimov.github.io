# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A static website that hosts Emil Ibrishimov's personal resume, served by GitHub Pages
at https://emilibrishimov.github.io. A visitor lands on the page and sees the resume and
nothing else.

## Design principles

- **Minimalistic and clean.** Typography and whitespace do the work. No decorative
  clutter, animations, or UI chrome that doesn't serve reading the resume.
- **Works on every form factor.** From large desktop monitors down to small smartphones.
  Responsive CSS; readable line lengths on wide screens; no horizontal scrolling on
  narrow ones.
- **Fast and dependency-free.** Plain HTML and CSS. Avoid JavaScript, frameworks, and
  build steps unless there's a clear need. Keep external requests (fonts, CDNs) to a minimum.
  The one exception is a small inline script (`<script id="durations">`) that recomputes
  the durations (e.g. "2 yrs 6 mos") from each `.duration` element's
  `data-start`/`data-end` months, counted inclusively; no `data-end` means "present". The
  durations written in the HTML are the fallback when scripts don't run, so keep them
  correct when editing dates.
- **Accessible and printable.** Semantic HTML, sufficient contrast, sensible print styles
  so the page prints cleanly as a resume.

## Structure

- `resume.txt` — the resume content in plain text; the source of truth for what the page says.
- `index.html` — the resume page (the site's entry point).
- `fonts/` — self-hosted Inter 4 (variable weight + optical size, Latin subset, from Fontsource).
- `tests/durations.test.js` — tests for the duration script and the dates it reads; run
  with `node tests/durations.test.js` (no dependencies).
- `tests/structured-data.test.js` — checks that the JSON-LD structured data in
  `index.html` matches the page; run with `node tests/structured-data.test.js`.
- `.nojekyll` — tells GitHub Pages to serve files as-is, without Jekyll processing.
- `AGENTS.md` — this file; the source of truth for agent instructions.
- `CLAUDE.md` — imports `AGENTS.md` for Claude Code.

## Deployment

Pushing to `main` publishes the site via GitHub Pages. There is no build step.

## Conventions

- Keep the site static: everything must work by opening `index.html` directly.
- Preview locally with `python3 -m http.server` and check both narrow and wide viewports.
- Don't invent resume content — only use information provided by Emil.
- After changing any dates, durations, or the duration script, run
  `node tests/durations.test.js` and make sure it passes. If it notes that an ongoing
  role's fallback text is out of date, update that text in `index.html`.
- The page has JSON-LD structured data (schema.org `Person`) in `<head>` for crawlers.
  When changing any resume content, update it to match and run
  `node tests/structured-data.test.js`.
- Keep the markup meaningful for machines, not just visually organized: sections are
  `h2`, employers and entry names `h3`, job titles `h4`, and each employer's roles are a
  list with one item per role.
- Never commit (or push) without Emil reviewing the diff locally and explicitly confirming
  first. Propose the commit message along with the diff so it can be reviewed too. Once
  confirmed, commit and push directly to `main` — no branches or pull requests.
- Commit messages should be clear and descriptive: a concise summary line that says what
  changed. Only add a body when the change is non-trivial and it's necessary.
- Don't add `Co-Authored-By` (or any other attribution) lines to commit messages.
- Changes to `AGENTS.md` go in the same commit as the files they relate to.
