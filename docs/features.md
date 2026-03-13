# OhMyDesk — Feature List

**34 features** across desk booking, revenue tracking, analytics, notifications, and workspace management.

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

## Revenue & Expenses
12. **Revenue dashboard** — monthly revenue, occupancy rate, net profit at a glance
13. **Revenue trend chart** — 3-month visual trend (revenue, expenses, net profit)
14. **Expense tracking** — log expenses by category (rent, supplies, internet, bills, accountant)
15. **Recurring expenses** — auto-generated monthly expenses (e.g. rent on the 1st)
16. **Per-desk pricing** — configurable default price per desk per day
17. **Multi-currency support** — EUR, USD, GBP

## Insights & Analytics
18. **Next available dates** — shows first 5 upcoming free dates
19. **Upcoming bookings** — see what's booked next
20. **Expiring assignments alert** — desks approaching end of assignment
21. **Occupancy statistics** — monthly weekday stats and utilization rates

## Workspace Management
22. **Multi-room setup** — up to 4 rooms, 12 desks per room
23. **Custom room & desk names** — rename everything inline
24. **Floor plan upload** — upload your space layout (JPEG, PNG, WebP, GIF)
25. **Waiting list** — track people waiting for a desk with contact info and preferences

## Notifications
26. **Telegram notifications** — daily alerts for bookings starting and assignments ending tomorrow; instant alerts on new public bookings
27. **Email notifications** — _(coming soon)_
28. **WhatsApp notifications** — _(coming soon)_
29. **SMS notifications** — _(coming soon)_

## Analytics (Umami)
30. **Visitor analytics** — pageviews, geography, referral sources, bounce rate via Umami Cloud
    - **Dashboard**: https://cloud.umami.is
    - **Website ID**: `1f5154a8-b100-4034-8bf9-ed3bf8399f9a`
    - **Ad-blocker bypass**: Cloudflare Worker proxy at `ohmydesk-analytics.bodrovphone.workers.dev`
      - `/s.js` — serves the tracking script (rewrites API endpoint to self)
      - `/api/send` — proxies event data to `api-gateway.umami.dev`
      - Worker source: `workers/analytics-proxy/worker.js`
      - Deploy: `cd workers/analytics-proxy && wrangler deploy`
    - **No cookies**, no GDPR banner needed
    - **Free tier**: 100K events/month
31. **Custom event tracking** — button click tracking on landing page:
    - `nav-login-click` — Nav "Log In"
    - `nav-signup-click` — Nav "Sign Up Free"
    - `hero-start-free-click` — Hero "Start Free" CTA
    - `hero-login-click` — Hero "Log In"
    - `pricing-cta-click` — Pricing card buttons (includes tier name)
    - `cta-get-started-click` — Bottom "Get Started Free"
    - `footer-linkedin-click` — Footer LinkedIn icon
    - Helper: `client/src/lib/analytics.ts` (event names in `EVENTS` constant)

## E2E Tests (Playwright)
32. **Landing page e2e tests** — 21 tests against production (`https://ohmydesk.app`)
    - Config: `playwright.config.ts`
    - Tests: `e2e/landing.spec.ts`
    - Run: `npm run test:e2e` (headless) or `npm run test:e2e:headed` (with browser)
    - Covers: meta tags, nav, hero, social proof, product showcase, features, notifications, pricing, CTAs, footer, analytics script

## Platform
33. **Multi-organization support** — manage multiple coworking spaces from one account
34. **Shareable public pages** — booking confirmation pages accessible without login
- Real-time sync across devices
- Data export (JSON)
- 2-minute onboarding wizard
- Works on desktop and mobile
