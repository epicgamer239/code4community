# WCAG 2.1 Level AA — how Code4Community maps to each criterion

**Legend:** ✅ Addressed (automated and/or implemented) · 🟡 Partial (some flows or manual follow-up) · ➖ Not applicable · 👤 Manual verification recommended

This is a good-faith engineering checklist for staff review, not a legal conformance certificate.

| ID | Criterion | Status | What we did |
|----|-----------|--------|-------------|
| **1.1.1** | Non-text Content (alt text) | ✅ | Descriptive `alt` on content images; decorative images use `alt=""` + `aria-hidden` where redundant; axe + `npm run a11y:static` on source |
| **1.2.1–1.2.5** | Audio/video alternatives | ➖ | No hosted video/audio requiring captions on public pages |
| **1.3.1** | Info and Relationships | ✅ | Landmarks (`main`, `nav`, `footer`), headings, form labels, tables where used |
| **1.3.2** | Meaningful Sequence | 🟡 | Logical DOM order; complex tools (seating chart) 👤 |
| **1.3.3** | Sensory Characteristics | ✅ | Instructions not “click the green button” only |
| **1.3.4** | Orientation | ✅ | Responsive layouts |
| **1.3.5** | Identify Input Purpose | 🟡 | `autocomplete` on login/signup email/password |
| **1.4.1** | Use of Color | 🟡 | Errors use text + `role="alert"`, not color alone |
| **1.4.2** | Audio Control | ➖ | No auto-playing audio |
| **1.4.3** | Contrast (Minimum) | ✅ | Global primary color + Club Hub muted text; axe contrast rules |
| **1.4.4** | Resize Text | ✅ | Zoom allowed (`maximumScale: 5`); relative units |
| **1.4.5** | Images of Text | ✅ | Logos excepted; mostly real text |
| **1.4.10** | Reflow | 🟡 | Marketing/tools responsive; some dense dashboards 👤 |
| **1.4.11** | Non-text Contrast | 🟡 | Focus rings on interactive controls |
| **1.4.12** | Text Spacing | 🟡 | Browser defaults; no blocking overrides |
| **1.4.13** | Content on Hover/Focus | 🟡 | Tooltips/menus dismiss with Escape where implemented |
| **2.1.1** | Keyboard | 🟡 | Core nav/auth/Club Hub; drag-heavy seating chart partial |
| **2.1.2** | No Keyboard Trap | ✅ | Escape closes mobile menu, account menu, club event editor |
| **2.1.4** | Character Key Shortcuts | ➖ | No single-key shortcuts that conflict |
| **2.2.1** | Timing Adjustable | ➖ | No session timeouts on public content |
| **2.2.2** | Pause, Stop, Hide | ➖ | Hero respects `prefers-reduced-motion` |
| **2.3.1** | Three Flashes | ✅ | No flashing content |
| **2.4.1** | Bypass Blocks | ✅ | Skip links to `main` |
| **2.4.2** | Page Titled | ✅ | `metadata.title` / `document.title` on routes |
| **2.4.3** | Focus Order | 🟡 | 👤 VoiceOver on multi-step flows |
| **2.4.4** | Link Purpose (In Context) | ✅ | Nav labels, “opens in new tab” sr-only where needed |
| **2.4.5** | Multiple Ways | ✅ | Nav, sitemap, internal links |
| **2.4.6** | Headings and Labels | ✅ | h1 on pages; form labels |
| **2.4.7** | Focus Visible | ✅ | `:focus-visible` rings sitewide pattern |
| **2.5.1–2.5.4** | Pointer gestures / input | 🟡 | Seating chart drag 👤; target sizes on primary CTAs |
| **3.1.1** | Language of Page | ✅ | `<html lang="en">` |
| **3.1.2** | Language of Parts | ➖ | English-only UI |
| **3.2.1** | On Focus | ✅ | No unexpected context change on focus alone |
| **3.2.2** | On Input | ✅ | Forms submit explicitly |
| **3.2.3** | Consistent Navigation | ✅ | Shared header/footer patterns |
| **3.2.4** | Consistent Identification | ✅ | Repeated controls labeled consistently |
| **3.3.1** | Error Identification | 🟡 | Auth forms; 👤 all admin forms |
| **3.3.2** | Labels or Instructions | ✅ | Login/signup/club editor fields |
| **3.3.3** | Error Suggestion | 🟡 | Auth error messages |
| **3.3.4** | Error Prevention (Legal) | ➖ | Not legal/financial transactions |
| **4.1.1** | Parsing | ✅ | Valid React/Next markup; axe DOM rules |
| **4.1.2** | Name, Role, Value | ✅ | ARIA on menus, tabs, dialogs where used |
| **4.1.3** | Status Messages | 🟡 | `aria-live` / `role="alert"` / `role="status"` on key flows |

## Evidence commands

```bash
npm run build && npm run start
npm run a11y:all    # axe (sitemap + extras), keyboard smoke, static alt scan, approval summary
```

See also: [`accessibility-for-approval.md`](./accessibility-for-approval.md) for latest automated run results.
