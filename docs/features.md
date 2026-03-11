# OhMyDesk — Feature List

**33 features** across desk booking, revenue tracking, analytics, notifications, and workspace management.

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
10. **Shareable booking confirmation** — share a public booking link via Copy, Telegram, WhatsApp, or Viber; shows space name, room, desk, and dates (no personal info or pricing); links auto-expire after booking end date; "Powered by OhMyDesk" promo footer on share page

## Revenue & Expenses
11. **Revenue dashboard** — monthly revenue, occupancy rate, net profit at a glance
12. **Revenue trend chart** — 3-month visual trend (revenue, expenses, net profit)
13. **Expense tracking** — log expenses by category (rent, supplies, internet, bills, accountant)
14. **Recurring expenses** — auto-generated monthly expenses (e.g. rent on the 1st)
15. **Per-desk pricing** — configurable default price per desk per day
16. **Multi-currency support** — EUR, USD, GBP

## Insights & Analytics
17. **Next available dates** — shows first 5 upcoming free dates
18. **Upcoming bookings** — see what's booked next
19. **Expiring assignments alert** — desks approaching end of assignment
20. **Occupancy statistics** — monthly weekday stats and utilization rates

## Workspace Management
21. **Multi-room setup** — up to 4 rooms, 12 desks per room
22. **Custom room & desk names** — rename everything inline
23. **Floor plan upload** — upload your space layout (JPEG, PNG, WebP, GIF)
24. **Waiting list** — track people waiting for a desk with contact info and preferences

## Notifications
25. **Telegram notifications** — daily alerts for bookings starting and assignments ending tomorrow
26. **Email notifications** — _(coming soon)_
27. **WhatsApp notifications** — _(coming soon)_
28. **SMS notifications** — _(coming soon)_

## Analytics (Umami)
29. **Visitor analytics** — pageviews, geography, referral sources, bounce rate via Umami Cloud
    - **Dashboard**: https://cloud.umami.is
    - **Website ID**: `1f5154a8-b100-4034-8bf9-ed3bf8399f9a`
    - **Ad-blocker bypass**: Cloudflare Worker proxy at `ohmydesk-analytics.bodrovphone.workers.dev`
      - `/s.js` — serves the tracking script (rewrites API endpoint to self)
      - `/api/send` — proxies event data to `api-gateway.umami.dev`
      - Worker source: `workers/analytics-proxy/worker.js`
      - Deploy: `cd workers/analytics-proxy && wrangler deploy`
    - **No cookies**, no GDPR banner needed
    - **Free tier**: 100K events/month
30. **Custom event tracking** — button click tracking on landing page:
    - `nav-login-click` — Nav "Log In"
    - `nav-signup-click` — Nav "Sign Up Free"
    - `hero-start-free-click` — Hero "Start Free" CTA
    - `hero-login-click` — Hero "Log In"
    - `pricing-cta-click` — Pricing card buttons (includes tier name)
    - `cta-get-started-click` — Bottom "Get Started Free"
    - `footer-linkedin-click` — Footer LinkedIn icon
    - Helper: `client/src/lib/analytics.ts` (event names in `EVENTS` constant)

## E2E Tests (Playwright)
31. **Landing page e2e tests** — 21 tests against production (`https://ohmydesk.app`)
    - Config: `playwright.config.ts`
    - Tests: `e2e/landing.spec.ts`
    - Run: `npm run test:e2e` (headless) or `npm run test:e2e:headed` (with browser)
    - Covers: meta tags, nav, hero, social proof, product showcase, features, notifications, pricing, CTAs, footer, analytics script

## Platform
32. **Multi-organization support** — manage multiple coworking spaces from one account
33. **Shareable public pages** — booking confirmation pages accessible without login
- Real-time sync across devices
- Data export (JSON)
- 2-minute onboarding wizard
- Works on desktop and mobile
