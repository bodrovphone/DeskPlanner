# OhMyDesk — Feature List

**52 features** across desk booking, meeting rooms, members, flex plans, revenue tracking, analytics, notifications, team management, and workspace management.

> **Roadmap & upcoming features** are managed in [Linear (Deskplanner team)](https://linear.app/deskplanner). The `docs/roadmap/` folder contains detailed specs for each feature but Linear is the source of truth for priorities, status, and dependencies.

## Desk Booking & Calendar
1. **Weekly & Monthly calendar views** — see all desks and dates at a glance
2. **One-click booking** — click any cell to create/edit a booking
3. **Three booking statuses** — Available, Booked, Assigned (with person name)
4. **Multi-day bookings** — set start and end dates for longer stays
5. **Bulk availability** — set availability for multiple desks across a date range in one action
6. **Quick Book** — auto-books the first available desk on the next free date
7. **Person assignment** — assign people to desks with name tracking
8. **Booking conflict detection** — prevents double-booking
9. **Pause & Extend** — pause a booking for selected days (freeing them for resale), automatically adds free extension days at the end; prices prorate correctly so revenue is never overcounted

## Sharing & Communication
10. **Shareable booking confirmation** — automatically prompted after every new booking or assignment; share a public booking link via Copy, Telegram, WhatsApp, or Viber; shows space name, room, desk, and dates (no personal info or pricing); links auto-expire after booking end date; "Powered by OhMyDesk" promo footer on share page
11. **Public booking page** — visitors book a desk at `/book/:orgSlug` without an account; 2-step flow (pick date, fill name + phone); desk auto-assigned; owner gets instant Telegram notification with visitor details; booking appears in calendar with contact info in title; scarcity badges ("Only 2 left") on low-availability dates; enable/disable per org in Settings with shareable link + max days ahead config; soft warning if Telegram not connected ("you'll only see bookings when you open the calendar"); currently Telegram-only for instant alerts

## Meeting Rooms
12. **Hourly booking grid** — time grid (08:00–20:00, 30-min slots) showing all meeting rooms side by side for a selected day
13. **Overlap prevention** — database-level exclusion constraint; friendly error shown if a slot is already taken
14. **Auto-pricing** — price auto-calculated from room's hourly rate × duration; manually overridable per booking
15. **Meeting room revenue** — tracked separately in Revenue dashboard; included in net profit calculation
16. **Meeting rooms in onboarding** — optional step 2 during space setup to configure meeting rooms with names and hourly rates
17. **Meeting room settings** — add/remove/rename meeting rooms and adjust rates at any time in Settings

## Revenue & Expenses
18. **Revenue dashboard** — monthly revenue, occupancy rate, net profit at a glance
19. **Revenue trend chart** — 3-month visual trend (revenue, expenses, net profit)
20. **Expense tracking** — log expenses by category (rent, supplies, internet, bills, accountant)
21. **Recurring expenses** — auto-generated monthly expenses (e.g. rent on the 1st)
22. **Per-desk pricing** — configurable default price per desk per day
23. **Multi-currency support** — EUR, USD (Bulgaria adopted EUR; GBP available for legacy data)

## Insights & Analytics
24. **Next available dates** — shows first 5 upcoming free dates
25. **Upcoming bookings** — see what's booked next
26. **Expiring assignments alert** — desks approaching end of assignment
27. **Occupancy statistics** — monthly weekday stats and utilization rates

## Members
28. **Persistent client records** — members table with name and contact info, linked to bookings via `client_id`
29. **Autocomplete in booking modal** — type a name to match existing members or create a new one inline
30. **Members management page** — editable table (name, contact, balance) with inline editing, debounced auto-save, search bar, and delete with confirmation dialog
31. **Name sync** — renaming a member automatically updates `person_name` on all their linked bookings

## Flex Plans
32. **Flex plan configuration** — Settings card to define days per plan and total price; per-visit price auto-calculated
33. **Member flex activation** — checkbox on Members page to activate/reset a flex plan with confirmation dialog; shows personal booking link on activation
34. **Flex-aware booking modal** — selecting a flex member shows amber balance banner with remaining days and per-visit price; auto-fills price and sets status to assigned; booking type toggle disabled
35. **Flex balance deduction** — each booking deducts from the member's flex balance; multi-day bookings deduct multiple days
36. **Calendar flex indicator** — yellow corner (top-right) on flex bookings distinguishes them from regular assignments
37. **Member self-service booking** — personal booking link (`/book/:memberId/:orgSlug`) shows member name, flex balance, upcoming bookings, and date picker; one-tap booking creates assigned entry and deducts balance; "Book another day" button on success; no login required
38. **Zero-balance handling** — member booking page shows "No flex days remaining" with space contact info when balance is depleted

## Workspace Management
39. **Multi-room setup** — up to 10 rooms (Free: 4 rooms, Pro: 10 rooms), unlimited desks per room
40. **Custom room & desk names** — rename everything inline
41. **Floor plan upload** — upload your space layout (JPEG, PNG, WebP, GIF)
42. **Waiting list** — track people waiting for a desk with contact info and preferences

## Notifications
43. **Telegram notifications** — daily alerts for bookings starting and assignments ending tomorrow; instant alerts on new public bookings
44. **Email notifications** — welcome email on signup; daily digest (bookings starting / assignments ending tomorrow); instant alert on new public bookings; lifecycle nudges (7-day inactivity, 30-day goodbye); configurable per-org in Settings; powered by Resend via Supabase Edge Functions
45. **WhatsApp notifications** — _(coming soon)_
46. **SMS notifications** — _(coming soon)_

## Analytics (Umami)
47. **Visitor analytics** — pageviews, geography, referral sources, bounce rate via Umami Cloud
    - **Dashboard**: https://cloud.umami.is
    - **Website ID**: `1f5154a8-b100-4034-8bf9-ed3bf8399f9a`
    - **Ad-blocker bypass**: Cloudflare Worker proxy at `ohmydesk-analytics.bodrovphone.workers.dev`
      - `/s.js` — serves the tracking script (rewrites API endpoint to self)
      - `/api/send` — proxies event data to `api-gateway.umami.dev`
      - Worker source: `workers/analytics-proxy/worker.js`
      - Deploy: `cd workers/analytics-proxy && wrangler deploy`
    - **No cookies**, no GDPR banner needed
    - **Free tier**: 100K events/month
48. **Custom event tracking** — button click tracking on landing page:
    - `nav-login-click` — Nav "Log In"
    - `nav-signup-click` — Nav "Sign Up Free"
    - `hero-start-free-click` — Hero "Start Free" CTA
    - `hero-login-click` — Hero "Log In"
    - `pricing-cta-click` — Pricing card buttons (includes tier name)
    - `cta-get-started-click` — Bottom "Get Started Free"
    - `footer-linkedin-click` — Footer LinkedIn icon
    - Helper: `client/src/lib/analytics.ts` (event names in `EVENTS` constant)

## E2E Tests (Playwright)
- **96 tests across 11 spec files** — runs against production (`https://ohmydesk.app`)
    - Config: `playwright.config.ts`
    - Run: `npm run test:e2e` (headless) or `npm run test:e2e:headed` (with browser)

| Spec file | Tests | Coverage |
|-----------|-------|----------|
| `e2e/landing.spec.ts` | 21 | Meta tags, nav, hero, social proof, product showcase, features, notifications, pricing, CTAs, footer, analytics script |
| `e2e/signup.spec.ts` | 5 | Form validation, password length error, sign-in link, successful signup + auth state save |
| `e2e/onboarding.spec.ts` | 13 | All 5 steps of the onboarding wizard, slug availability, full flow to calendar redirect |
| `e2e/app-login.spec.ts` | 3 | Page load, wrong password error, successful login redirect |
| `e2e/app-calendar.spec.ts` | 11 | Grid load, room/desk labels, view toggle, navigation, booking dialog, create/edit/delete booking, Quick Book, right-click cycle, share modal |
| `e2e/app-settings.spec.ts` | 9 | All 4 sub-routes load, org name + slug, currency buttons, working days toggle, rooms & desks, add room staging, notifications card, public booking toggle + shareable link, save persists |
| `e2e/app-revenue.spec.ts` | 4 | Dashboard load + stats, currency values, add/delete expense, recurring expense modal, chart render |
| `e2e/app-expenses.spec.ts` | — | (covered by app-revenue suite) |
| `e2e/app-waiting-list.spec.ts` | 4 | Page load, add + delete entry, empty state, modal validation |
| `e2e/app-insights.spec.ts` | 7 | Page load, stats cards, next available/booked dates, expiring assignments, click date → booking modal |
| `e2e/public-booking.spec.ts` | 9 | Not-found org, page load, date selection, calendar picker, contact form, phone validation (2 cases), successful booking |

    - **Auth strategy**: landing + public booking run unauthenticated; signup creates a fresh account; all `app-*` suites use a permanent test account (`e2e-testspace` org)
    - **Test data reset**: `reset_e2e_test_data` Supabase RPC runs in `globalSetup` before each full suite run

## Team Management
49. **Manager invitations** — owner invites managers by email; system creates their account with generated credentials, sends branded email via Resend, and adds them to the space automatically
50. **Role-based access** — two roles: Owner (full access) and Manager (bookings, calendar, members, waiting list — no revenue or expense visibility); sidebar and settings filtered by role
51. **Team settings card** — owner-only card in Settings showing current team members with role badges, invite form, and remove button; max 3 members per space (owner + 2 managers)

## Platform
52. **Multi-organization support** — manage multiple coworking spaces from one account
- Shareable public pages — booking confirmation pages accessible without login
- 2-minute onboarding wizard
- Works on desktop and mobile
