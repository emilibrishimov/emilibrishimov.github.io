# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

A static website that hosts Emil Ibrishimov's personal resume, served by GitHub Pages
at https://emilibrishimov.github.io. A visitor lands on the page and sees the resume —
nothing else. Think of it as a personal, self-hosted version of a public LinkedIn profile.

## Design principles

- **Minimalistic and clean.** Typography and whitespace do the work. No decorative
  clutter, animations, or UI chrome that doesn't serve reading the resume.
- **Works on every form factor.** From large desktop monitors down to small smartphones.
  Mobile-first responsive CSS; readable line lengths on wide screens; no horizontal
  scrolling on narrow ones.
- **Fast and dependency-free.** Plain HTML and CSS. Avoid JavaScript, frameworks, and
  build steps unless there's a clear need. Keep external requests (fonts, CDNs) to a minimum.
- **Accessible and printable.** Semantic HTML, sufficient contrast, sensible print styles
  so the page prints cleanly as a resume.

## Structure

- `index.html` — the resume page (the site's entry point).
- `.nojekyll` — tells GitHub Pages to serve files as-is, without Jekyll processing.
- `AGENTS.md` — this file; the source of truth for agent instructions.
- `CLAUDE.md` — imports `AGENTS.md` for Claude Code.

## Deployment

Pushing to `main` publishes the site via GitHub Pages. There is no build step.

## Conventions

- Keep the site static: everything must work by opening `index.html` directly.
- Preview locally with `python3 -m http.server` and check both narrow and wide viewports.
- Don't invent resume content — only use information provided by Emil.
