# E2E User Journeys

Test suite runs against production: https://ohmydesk.app
Config: `playwright.config.ts` | Tests: `e2e/` | Run: `npm run test:e2e`

---

## Journey 1: Landing Page Visitor ✅

**Persona**: Coworking operator discovering OhMyDesk for the first time
**Goal**: Understand the product and decide whether to sign up
**File**: `e2e/landing.spec.ts` (25 tests)

| Step | What visitor does | What we verify | Status |
|------|-------------------|----------------|--------|
| 1 | Opens ohmydesk.app | Page loads (200), title & meta/OG tags correct | ✅ |
| 2 | Sees the nav bar | Logo visible, Log In → /login, Sign Up → /signup | ✅ |
| 3 | Reads the hero | Typing animation completes, beta badge visible, CTAs link correctly | ✅ |
| 4 | Scrolls to social proof | Stats render (2,400+ desks, 340+ spaces, 99.9% uptime, <2min setup) | ✅ |
| 5 | Sees the product demo | Faux calendar with desk rows, stats cards (Available/Booked/Assigned), revenue ($4,280) | ✅ |
| 6 | Reviews features | All 4 cards: Visual Calendar, Revenue Tracking, Waiting List, Multi-Room Control | ✅ |
| 7 | Checks notifications | Telegram = Live, Email/WhatsApp/SMS = Coming Soon | ✅ |
| 8 | Reads how it works | 3 steps: Create your space, Manage bookings, Grow revenue | ✅ |
| 9 | Compares pricing | Free/Pro/Enterprise tiers, $18 early bird, Enterprise CTA disabled, footnote on custom integrations | ✅ |
| 10 | Sees integrations | 8 integration badges (Telegram, Slack, Stripe, Shopify, Google Calendar, Zapier, QuickBooks, HubSpot), custom integration tagline | ✅ |
| 11 | Hits bottom CTA | "Get Started Free" → /signup | ✅ |
| 12 | Checks footer | LinkedIn link correct, copyright present | ✅ |
| 13 | (Behind the scenes) | Umami analytics script loaded with correct website ID | ✅ |

---

## Journey 2–9: In-App Suites ❌ Not covered

Full plan with test cases, infrastructure setup, and implementation order:
**See [`docs/todo/e2e-test-plan.md`](../docs/todo/e2e-test-plan.md)**

Suites planned:
- Sign Up & Onboarding (fresh account per run)
- Login / Returning User
- Calendar (core booking flow)
- Revenue & Expenses
- Waiting List
- Settings (incl. public booking card)
- Insights
- Public Booking page (no auth)
