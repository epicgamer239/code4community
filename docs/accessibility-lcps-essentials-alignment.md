# LCPS “Accessibility Essentials” — Code4Community web alignment

This maps the **LCPS instructional-materials checklist** (ADA Title II context) to the **Code4Community website** (`code4community26.web.app`). Items that apply only to Word, PowerPoint, or PDF handouts are marked **N/A (format)**; we still follow the same *intent* on the web where it applies.

**Related:** [accessibility-for-approval.md](./accessibility-for-approval.md) · [accessibility-wcag-2.1-aa-checklist.md](./accessibility-wcag-2.1-aa-checklist.md)

---

## Text & Readability

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Sans-serif fonts (Calibri, Arial, Roboto, Lato, Helvetica) | **Aligned.** Site uses **Inter** and **Geist** (sans-serif) via `app/layout.js`. |
| Large, clear text (12pt body docs / 18pt slides) | **Aligned for web.** Body copy uses **≥15–16px** (`text-base`, `text-[15px]`) on marketing and tools; headings use semantic `h1`–`h3`. Slide point sizes **N/A (format)**. |
| Descriptive hyperlinks (not “click here”) | **Aligned.** Nav and CTAs use descriptive labels (e.g. “Log in”, “Our Work”, “Learn more about Code4Community”). Blog cards link the full article title; footer links name destinations. We avoid “click here” in UI copy. |

---

## Structure & Organization

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Built-in headings/styles, not bold alone | **Aligned.** Pages use real heading hierarchy (`h1` per route, `h2`/`h3` in sections). Club Hub and tools use semantic sections and landmarks. |
| Small, clearly defined sections | **Aligned.** Marketing and Club Hub content is split into sections with headings; skip links jump to `main`. |
| Built-in lists for bullets/numbers | **Aligned.** Lists use `<ul>` / `<ol>` in content and forms where appropriate. |
| Tables for data only, not layout | **Aligned.** HTML tables appear for data (e.g. Math Lab session tracking, Club Hub rosters). Page layout uses CSS grid/flex, not layout tables. |

---

## Images & Visual Support

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Alt text on images, charts, graphs | **Aligned.** Meaningful images have descriptive `alt`; decorative images use `alt=""` and/or `aria-hidden` when redundant with text. `npm run a11y:static` scans source for missing `alt`. |
| Words + visuals (icons with labels) | **Aligned.** Icon-only controls include `aria-label` (nav, Math Lab sidebar, password toggle). |
| Don’t use color alone for meaning | **Aligned.** Errors use text + `role="alert"`; required fields use labels; status is not conveyed by color only. Some tool UIs should be spot-checked when adding new features. |

---

## Color & Contrast

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Strong text/background contrast | **Aligned.** Primary colors and Club Hub muted text tuned for **WCAG 2.1 AA** contrast; club banner overlay darkened for white title text. Automated axe scans on public routes. |

---

## Audio, Video and Media

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Captions on audio and video | **N/A today.** Public site does not host instructional video/audio players. If we add video later, we will provide captions/transcripts. Writing Center **PDFs** uploaded by tutors should be accessible at source (see below). |

---

## File Format & Sharing

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Share text-based documents, not scans | **Partial / process.** The app is HTML (text-based). **Writing Center** stores PDF feedback files—quality depends on how tutors export (prefer “Save as PDF” from accessible docs, not phone photos of paper). Document this in tutor training. |

---

## Presentations & Slides

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Unique slide titles, reading order, layouts | **N/A (format)** — not a slide deck. **Same intent on web:** one clear **`h1` per page**, logical DOM order, landmarks (`main`, `nav`, `footer`). |

---

## Compliance Check (Required)

| LCPS requirement | Web / Code4Community |
|------------------|----------------------|
| Run accessibility checker before sharing; fix issues | **Aligned.** Before releases: `npm run a11y:all` (axe on sitemap URLs, keyboard smoke tests, alt scan). Results summarized in [accessibility-for-approval.md](./accessibility-for-approval.md). Manual VoiceOver pass recommended for staff demo. |

---

## Summary for LCPS / staff review

Code4Community is a **web application**, not a packet of Word/PPT files, but it follows the **same principles** in this checklist: readable sans-serif type, descriptive links, headings and lists, alt text, contrast, no color-only meaning, and **documented automated checks** plus a path for user feedback ([Contact](https://code4community26.web.app/contact)).

**Not claimed:** Full legal ADA certification or accessibility of every user-uploaded PDF in Writing Center.

**Contact for barriers:** brhsc4c@gmail.com · [Contact page](https://code4community26.web.app/contact)
