# OhMyDesk — Feature List

**38 features** across desk booking, meeting rooms, revenue tracking, analytics, notifications, and workspace management.

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
10. **Hourly booking grid** — time grid (08:00–20:00, 30-min slots) showing all meeting rooms side by side for a selected day
11. **Overlap prevention** — database-level exclusion constraint; friendly error shown if a slot is already taken
12. **Auto-pricing** — price auto-calculated from room's hourly rate × duration; manually overridable per booking
13. **Meeting room revenue** — tracked separately in Revenue dashboard; included in net profit calculation
14. **Meeting rooms in onboarding** — optional step 2 during space setup to configure meeting rooms with names and hourly rates
15. **Meeting room settings** — add/remove/rename meeting rooms and adjust rates at any time in Settings

## Revenue & Expenses
16. **Revenue dashboard** — monthly revenue, occupancy rate, net profit at a glance
17. **Revenue trend chart** — 3-month visual trend (revenue, expenses, net profit)
18. **Expense tracking** — log expenses by category (rent, supplies, internet, bills, accountant)
19. **Recurring expenses** — auto-generated monthly expenses (e.g. rent on the 1st)
20. **Per-desk pricing** — configurable default price per desk per day
21. **Multi-currency support** — EUR, USD, GBP

## Insights & Analytics
22. **Next available dates** — shows first 5 upcoming free dates
23. **Upcoming bookings** — see what's booked next
24. **Expiring assignments alert** — desks approaching end of assignment
25. **Occupancy statistics** — monthly weekday stats and utilization rates

## Workspace Management
26. **Multi-room setup** — up to 10 rooms (Free: 4 rooms, Pro: 10 rooms), unlimited desks per room
27. **Custom room & desk names** — rename everything inline
28. **Floor plan upload** — upload your space layout (JPEG, PNG, WebP, GIF)
29. **Waiting list** — track people waiting for a desk with contact info and preferences

## Notifications
30. **Telegram notifications** — daily alerts for bookings starting and assignments ending tomorrow; instant alerts on new public bookings
31. **Email notifications** — _(coming soon)_
32. **WhatsApp notifications** — _(coming soon)_
33. **SMS notifications** — _(coming soon)_

## Analytics (Umami)
34. **Visitor analytics** — pageviews, geography, referral sources, bounce rate via Umami Cloud
    - **Dashboard**: https://cloud.umami.is
    - **Website ID**: `1f5154a8-b100-4034-8bf9-ed3bf8399f9a`
    - **Ad-blocker bypass**: Cloudflare Worker proxy at `ohmydesk-analytics.bodrovphone.workers.dev`
      - `/s.js` — serves the tracking script (rewrites API endpoint to self)
      - `/api/send` — proxies event data to `api-gateway.umami.dev`
      - Worker source: `workers/analytics-proxy/worker.js`
      - Deploy: `cd workers/analytics-proxy && wrangler deploy`
    - **No cookies**, no GDPR banner needed
    - **Free tier**: 100K events/month
35. **Custom event tracking** — button click tracking on landing page:
    - `nav-login-click` — Nav "Log In"
    - `nav-signup-click` — Nav "Sign Up Free"
    - `hero-start-free-click` — Hero "Start Free" CTA
    - `hero-login-click` — Hero "Log In"
    - `pricing-cta-click` — Pricing card buttons (includes tier name)
    - `cta-get-started-click` — Bottom "Get Started Free"
    - `footer-linkedin-click` — Footer LinkedIn icon
    - Helper: `client/src/lib/analytics.ts` (event names in `EVENTS` constant)

## E2E Tests (Playwright)
36. **Landing page e2e tests** — 21 tests against production (`https://ohmydesk.app`)
    - Config: `playwright.config.ts`
    - Tests: `e2e/landing.spec.ts`
    - Run: `npm run test:e2e` (headless) or `npm run test:e2e:headed` (with browser)
    - Covers: meta tags, nav, hero, social proof, product showcase, features, notifications, pricing, CTAs, footer, analytics script

## Platform
37. **Multi-organization support** — manage multiple coworking spaces from one account
38. **Shareable public pages** — booking confirmation pages accessible without login
- 2-minute onboarding wizard
- Works on desktop and mobile
