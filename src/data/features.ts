import type { ImageMetadata } from 'astro';

import bookingShot from '../assets/screenshots/booking-modal.png';
import membersShot from '../assets/screenshots/members.png';
import flexPlanShot from '../assets/screenshots/flex-plan.png';
import meetingRoomShot from '../assets/screenshots/meeting-room.png';
import floorPlanShot from '../assets/screenshots/floor-plan-editor.png';
import mapViewShot from '../assets/screenshots/map-view.png';
import publicBookingShot from '../assets/screenshots/public-booking-confirmation.png';
import revenueShot from '../assets/screenshots/revenue.png';
import expensesShot from '../assets/screenshots/expenses.png';
import waitingListShot from '../assets/screenshots/waiting-list.png';
import notificationsShot from '../assets/screenshots/notifications.png';
import tgNotificationShot from '../assets/screenshots/tg-booking-notification.png';
import multiLocationsShot from '../assets/screenshots/multi-locations.png';

export interface Feature {
  slug: string;
  eyebrow: string;
  title: string;
  quickAnswer?: string;
  intro: string;
  bullets: string[];
  images: { src: ImageMetadata; alt: string }[];
}

export const features: Feature[] = [
  {
    slug: 'booking',
    eyebrow: 'Booking',
    title: 'Visual desk booking calendar',
    quickAnswer: 'OhMyDesk shows every desk in every room as a color-coded weekly or monthly grid. Operators click a cell to book, drag to select a range, or ctrl-click for bulk updates — no dropdowns, no page reloads.',
    intro:
      'A weekly and monthly calendar grid showing every desk in every room at a glance. Click any cell to book, drag to select a range, ctrl-click to bulk update. Built for managers who need to see capacity at one look — not for end users hunting through dropdowns.',
    bullets: [
      'Weekly and monthly views with smooth navigation between weeks',
      'Three booking states: Available, Booked, Assigned — color-coded',
      'Bulk operations: range selection, ctrl-click, multi-day bookings',
      'Today is auto-highlighted and scrolled into view',
      'Sub-second updates — no spinners between clicks',
    ],
    images: [{ src: bookingShot, alt: 'Desk booking modal showing date range, member, and pricing fields' }],
  },
  {
    slug: 'members',
    eyebrow: 'Members',
    title: 'Member management with autocomplete',
    intro:
      "Persistent member records with everything you'd expect: contact info, visit history, current bookings, and balances. As you start typing a member's name in any booking, autocomplete fills the rest. No more typing the same person twenty times a month.",
    bullets: [
      'Autocomplete in every booking dialog — no duplicate entries',
      'Per-member visit history and active bookings at a glance',
      'Phone, email, Telegram, and notes per member',
      'Soft delete preserves historical bookings even after a member leaves',
      'Member self-service booking link (no login required)',
    ],
    images: [{ src: membersShot, alt: 'Members list with autocomplete and contact details' }],
  },
  {
    slug: 'flex-plans',
    eyebrow: 'Flex plans',
    title: 'Flex day packages with auto-balance tracking',
    quickAnswer: 'Flex plans let you sell prepaid day-pass bundles (e.g. "10 days for €80"). Members self-book via a personal link and their balance decrements automatically — no admin involvement needed per booking.',
    intro:
      'Sell prepaid day packages (e.g. "10 days for €80") instead of forcing members onto monthly subscriptions. Each member gets a personal booking link, picks the days they want, and the system tracks their balance automatically. Perfect for hybrid workers.',
    bullets: [
      'Configurable packages: number of days, price, validity period',
      'Members self-book via personal link — no admin involvement',
      'Balance auto-decrements with each booking',
      'Email reminders when balance is low or about to expire',
      'Disable mid-flight without losing any historical balance data',
    ],
    images: [{ src: flexPlanShot, alt: 'Flex day package configuration and member balance tracking' }],
  },
  {
    slug: 'meeting-rooms',
    eyebrow: 'Meeting rooms',
    title: 'Hourly meeting room reservations',
    intro:
      'Separate hourly grid for conference rooms with their own pricing and rules. Avoid conflicts automatically and track meeting room revenue alongside desk revenue without mixing them up. Half-hour granularity by default.',
    bullets: [
      'Hourly time slots with conflict detection',
      'Per-room pricing (different rates for different rooms)',
      'Booked-by attribution and contact info on every reservation',
      'Revenue tracked separately from desks for clean reporting',
      'Visible to public booking page if you want walk-in revenue',
    ],
    images: [{ src: meetingRoomShot, alt: 'Hourly meeting room reservation grid with conflict detection' }],
  },
  {
    slug: 'floor-plan',
    eyebrow: 'Floor plan',
    title: 'Interactive floor plan editor',
    quickAnswer: 'Draw your actual space inside OhMyDesk — drag desks, tables, couches, walls, and doors onto a canvas that matches your real layout. No external tools, no image uploads. The plan auto-saves every 10 seconds and powers the Map calendar view.',
    intro:
      'A drag-and-drop canvas where you recreate your real space: every desk, table, couch, wall, door, window, and room feature. Run multiple rooms on a single shared canvas if your space is open-plan. Once built, the floor plan becomes a live booking surface — not just a static image.',
    bullets: [
      'Drag-and-drop placement: desks, tables, couches, walls, doors, windows, WC, kitchen, pillars',
      'Rotate any object to match your real floor layout',
      'Combine multiple rooms into one shared canvas for open-plan spaces',
      'Auto-saves every 10 seconds — no manual save needed',
      'Powers the Map calendar view for date-based desk availability',
    ],
    images: [{ src: floorPlanShot, alt: 'Floor plan editor canvas with desks and furniture placed on an interactive grid' }],
  },
  {
    slug: 'map-view',
    eyebrow: 'Map view',
    title: 'Map calendar view — see your space, not a spreadsheet',
    quickAnswer: 'Switch to Map view in the calendar and see your actual floor plan with every desk colour-coded by its booking status for the selected date. Click any desk to open the booking modal directly from the map.',
    intro:
      'A third calendar mode alongside Week and Month. Instead of rows and columns, you see your real floor plan with desks lit up by status: green for available, orange for booked, blue for assigned. Pick any date, click any desk, make or edit a booking — without ever leaving the map.',
    bullets: [
      'Real floor plan rendered live — not a static image',
      'Colour-coded desk status: green (available), orange (booked), blue (assigned)',
      'Click any desk to open the booking modal directly',
      'Date navigation skips weekends and non-working days automatically',
      'Works across all rooms on a combined canvas',
    ],
    images: [{ src: mapViewShot, alt: 'Map calendar view showing floor plan with desks colour-coded by booking status' }],
  },
  {
    slug: 'public-booking',
    eyebrow: 'Public booking',
    title: 'Public booking page for walk-ins and visitors',
    quickAnswer: 'Each coworking space gets a shareable public booking URL. Visitors see live desk availability, submit their details, and the admin gets an instant Telegram notification to approve or decline — no login required from the visitor.',
    intro:
      'A no-login booking page anyone can use. Share the link in social media, on flyers, or on your own website. Visitors see real-time availability, fill in their info, and submit a booking — you get a Telegram notification immediately and can approve or decline.',
    bullets: [
      'Real-time availability — visitors see live desk and meeting room slots',
      'No account required — fill name, email, dates and submit',
      'Instant Telegram notification to admins on every new request',
      'Approve, decline, or auto-confirm based on your preference',
      'Free SEO surface — every coworking space gets its own indexable page',
    ],
    images: [{ src: publicBookingShot, alt: 'Public booking confirmation page that visitors see after submitting a request' }],
  },
  {
    slug: 'stripe-payments',
    eyebrow: 'Payments',
    title: 'Stripe Checkout payments for public bookings',
    quickAnswer: 'Let visitors pay for day passes online before their booking is confirmed. Each space connects their own Stripe account — funds go directly to them and OhMyDesk takes no cut.',
    intro:
      'Enable paid public bookings in two minutes. Each coworking space connects their own Stripe account from Settings → Integrations (just paste your API keys — no complicated Stripe Connect onboarding). Flip the "Charge visitors" toggle and the public booking page instantly switches from "Book Desk" to "Pay €X & Book". Visitors go through Stripe Hosted Checkout, payment confirms the booking automatically, and the funds land directly in your Stripe account.',
    bullets: [
      'Connect your own Stripe account — OhMyDesk never touches the money',
      'Per-feature toggle: turn paid bookings on or off without disconnecting Stripe',
      'Hosted Stripe Checkout — no card data ever touches OhMyDesk',
      'Booking auto-confirmed via webhook after successful payment',
      'Cancellation handled gracefully: visitors can retry after abandoning checkout',
      'Paid bookings show a Stripe-coloured indigo marker on the calendar',
      'Multi-currency support — visitors pay in whatever currency your space is set to',
    ],
    images: [{ src: publicBookingShot, alt: 'Public booking page with Pay and Book button powered by Stripe Checkout' }],
  },
  {
    slug: 'revenue',
    eyebrow: 'Revenue',
    title: 'Revenue tracking & projections',
    quickAnswer: 'The revenue dashboard shows confirmed income (Assigned bookings) and projected income (Booked) side by side, broken down by room and currency. Only space owners can see it — staff and members never see financial data.',
    intro:
      'Confirmed and projected revenue side by side, broken down by room, by desk type, and across the whole portfolio. Currency-aware and prorated for partial-month bookings. Designed for owners who need to know "how is this month tracking?" at one glance.',
    bullets: [
      'Confirmed (Assigned) and Projected (Booked) shown separately',
      'Per-month, per-room, per-desk breakdowns',
      'Multi-currency support (EUR, USD, GBP) — historical BGN preserved',
      'Prorated calculations for partial-period bookings',
      'Owner-only by default — staff and members never see numbers',
    ],
    images: [{ src: revenueShot, alt: 'Revenue dashboard showing confirmed and projected income breakdowns' }],
  },
  {
    slug: 'expenses',
    eyebrow: 'Expenses',
    title: 'Expense tracking with custom categories',
    intro:
      'Track recurring and one-off expenses against custom categories you define. Every new workspace starts with sensible defaults (Rent, Supplies, Internet, Bills, Accountant, Other) and you can rename or add your own. Net revenue (revenue minus expenses) is computed automatically.',
    bullets: [
      'Custom expense categories — rename, add, delete inline',
      'Recurring expenses (rent, internet, software) auto-billed each month',
      'One-off expenses for irregular costs',
      'Net revenue card on the dashboard combines income and outflow',
      '6 sensible defaults seeded for new workspaces',
    ],
    images: [{ src: expensesShot, alt: 'Expense tracking page with custom categories and recurring expenses' }],
  },
  {
    slug: 'waiting-list',
    eyebrow: 'Waiting list',
    title: 'Built-in waiting list & demand queue',
    intro:
      'When all your desks are full, prospects join a waiting list automatically. The list shows who is waiting, what dates they wanted, and how to reach them. When a desk opens up, you contact the next person — no spreadsheet, no missed leads.',
    bullets: [
      'Auto-populated when public bookings request unavailable dates',
      'Manual entries for walk-ins and email inquiries',
      'Preferred dates, contact info, and notes per entry',
      'Mark contacted, converted, or lost so you have a paper trail',
      'Demand signal — see when you should consider expanding capacity',
    ],
    images: [{ src: waitingListShot, alt: 'Waiting list with prospect contact info and preferred dates' }],
  },
  {
    slug: 'notifications',
    eyebrow: 'Notifications',
    title: 'Telegram & email notifications',
    intro:
      'Real-time notifications for every important event: new booking, public booking request, flex plan running low, member added. Telegram is the primary channel (it works everywhere, free, instant) with email as a fallback. WhatsApp and SMS are coming.',
    bullets: [
      'Telegram bot integration — pair your account in 30 seconds',
      'Email notifications via Resend — branded with your space name',
      'Per-channel and per-event toggles (mute what you do not need)',
      'Public booking notifications include visitor contact info',
      'WhatsApp and SMS coming soon',
    ],
    images: [
      { src: notificationsShot, alt: 'In-app notification settings showing per-event toggles' },
      { src: tgNotificationShot, alt: 'Example Telegram notification when a new booking comes in' },
    ],
  },
  {
    slug: 'multi-location',
    eyebrow: 'Multi-location',
    title: 'Run multiple coworking spaces from one account',
    intro:
      'Operate two, ten, or fifty coworking locations under a single OhMyDesk account. Each location has its own rooms, desks, and members, but you get a unified dashboard, shared member directory, and one bill. Available on the Multi-Location plan.',
    bullets: [
      'Unlimited locations under one account',
      'Per-location rooms, desks, pricing, and team',
      'Shared member directory — members can book across locations',
      'Unified billing — one invoice for all your spaces',
      'Per-location revenue and expense reports',
    ],
    images: [{ src: multiLocationsShot, alt: 'Multi-location switcher showing several coworking spaces under one account' }],
  },
];

/** Returns `count` other features starting from the one after `slug`, wrapping around. */
export function getRelated(slug: string, count = 3): Feature[] {
  const idx = features.findIndex(f => f.slug === slug);
  const after = features.slice(idx + 1);
  const before = features.slice(0, idx);
  return [...after, ...before].slice(0, count);
}
