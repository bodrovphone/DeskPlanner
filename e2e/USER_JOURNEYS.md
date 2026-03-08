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

## Journey 2: Sign Up ❌ Not covered

**Persona**: Interested operator ready to create an account
**Steps to cover**:
- Navigate to /signup
- Fill in email & password
- Submit form
- Verify redirect to onboarding

## Journey 3: Onboarding Wizard ❌ Not covered

**Persona**: New user setting up their space
**Steps to cover**:
- Step 1: Enter space name, city
- Step 2: Configure rooms & desks
- Step 3: Set currency
- Verify redirect to dashboard after completion

## Journey 4: Desk Booking ❌ Not covered

**Persona**: Operator managing daily bookings
**Steps to cover**:
- View weekly calendar
- Click a cell to create a booking
- Assign a person
- Set dates and pricing
- Verify booking appears on calendar
- Switch to monthly view

## Journey 5: Revenue Tracking ❌ Not covered

**Persona**: Operator reviewing financials
**Steps to cover**:
- Open revenue dashboard
- Verify monthly revenue, occupancy, net profit
- Add an expense
- Add a recurring expense
- Verify revenue trend chart updates

## Journey 6: Waiting List ❌ Not covered

**Persona**: Operator managing demand
**Steps to cover**:
- Add person to waiting list
- Set preferred room/desk
- Assign desk from waiting list
- Remove from waiting list

## Journey 7: Settings & Space Config ❌ Not covered

**Persona**: Operator customizing their workspace
**Steps to cover**:
- Rename rooms and desks
- Upload floor plan
- Change currency
- Update default desk pricing

## Journey 8: Login / Returning User ❌ Not covered

**Persona**: Existing operator returning to manage bookings
**Steps to cover**:
- Navigate to /login
- Enter credentials
- Verify redirect to dashboard
- Verify previous data is intact
