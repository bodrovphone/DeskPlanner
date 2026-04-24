export interface ChangelogEntry {
  /** ISO date, e.g. "2026-04-11" */
  date: string;
  title: string;
  description: string;
  /** Short labels shown as chips, e.g. ["Payments", "Public booking"] */
  tags?: string[];
  /** Slug under /features/<slug>/ — when set, the entry links to that page. */
  linkedFeature?: string;
}

/**
 * Source of truth for the public /changelog/ page.
 * Newest first. Dates verified against `git log --date=short`.
 * Add a new entry at the top; the page groups automatically by month.
 */
export const changelog: ChangelogEntry[] = [
  {
    date: '2026-04-24',
    title: 'Billing details on member profiles',
    description:
      "Ready for invoicing. Each member now has a billing address and a payment method (credit card, cash, or bank transfer), tucked behind a card icon in the Members table. The icon goes blue when a member has their details filled — so you can see at a glance who's ready to invoice and who still needs a chase. Groundwork for automated invoices, coming next.",
    tags: ['Members', 'Billing'],
  },
  {
    date: '2026-04-17',
    title: 'Dedicated desk plans with freeze option',
    description:
      "Stop juggling spreadsheets for fixed-desk members. Set a weekly or monthly price in Settings, pick the plan when booking, and the system handles everything: auto-creates the member, tracks their remaining days on the Members page, and prorates revenue cleanly. When a member needs a break, freeze their plan from the booking dialog — remaining days are banked and the desk opens up for others. Ready to come back? Hit Reactivate and the system finds available desks automatically, even splitting across multiple desks if no single one is free for the full run.",
    tags: ['Plans', 'Members', 'Booking'],
    linkedFeature: 'dedicated-plans',
  },
  {
    date: '2026-04-11',
    title: 'Stripe Checkout on public booking page',
    description:
      "Accept payments the moment a visitor books a desk — no more chasing invoices after the fact. Connect your own Stripe account in Settings, flip one toggle, and your public booking link shows a Pay & Book button. Funds land directly in your account; we take zero commission and never touch your money. When two visitors race for the last desk, only the successful payment wins the seat.",
    tags: ['Payments', 'Public booking'],
    linkedFeature: 'stripe-payments',
  },
  {
    date: '2026-04-08',
    title: 'Floor plan on booking confirmation',
    description:
      "Help every visitor find their seat without texting you for directions. After booking, the confirmation page now shows your floor plan with their desk highlighted in orange — so no more 'which desk am I?' messages on a Monday morning. Works beautifully on phones. If you haven't drawn a floor plan yet, the page just shows the desk name.",
    tags: ['Floor plan', 'Public booking'],
    linkedFeature: 'floor-plan',
  },
  {
    date: '2026-04-07',
    title: 'Map calendar view',
    description:
      "See your whole space at a glance. The new Map view puts your floor plan front and center with every desk color-coded for the day you pick — free, booked, or assigned. Click any desk to book it; arrow through to the next working day. The fastest way to answer 'how full are we Thursday?'",
    tags: ['Calendar', 'Floor plan'],
    linkedFeature: 'map-view',
  },
  {
    date: '2026-04-07',
    title: 'Interactive floor plan editor',
    description:
      "Draw your coworking space the way it actually looks. Drag desks, tables, couches, walls, doors, windows, WC, kitchen, and pillars onto a canvas; rotate anything; combine multiple rooms into one shared view. It auto-saves every 10 seconds so you can close the tab without thinking. Once drawn, your floor plan powers the Map calendar view and every booking confirmation.",
    tags: ['Floor plan', 'Workspace'],
    linkedFeature: 'floor-plan',
  },
  {
    date: '2026-04-01',
    title: 'Multi-location support',
    description:
      "Running two or three coworking spaces? One login now covers them all. Switch between locations from the sidebar — each has its own rooms, members, calendar, and revenue. Built for growing operators who outgrew single-space tools but don't want to pay three separate subscriptions.",
    tags: ['Multi-location'],
    linkedFeature: 'multi-location',
  },
  {
    date: '2026-03-26',
    title: 'Team members with role-based access',
    description:
      "Bring your community manager on board without handing them the keys to your revenue. Invite by email — we create their account, send the credentials, and plug them into your space in one step. Managers handle bookings, members, and the waiting list; revenue and expenses stay private to owners. Up to two managers per space.",
    tags: ['Team', 'Permissions'],
  },
  {
    date: '2026-03-24',
    title: 'Flex day packages',
    description:
      "Sell prepaid day passes without spreadsheets. Set up a plan (say, 10 days for €100), activate it on any member, and they get a personal booking link. Every visit deducts a day; multi-day stays deduct the right number automatically. When the balance runs out, the member sees a friendly 'talk to your space manager' screen — not an error. The easiest way to turn walk-ins into regulars.",
    tags: ['Flex plans', 'Members'],
    linkedFeature: 'flex-plans',
  },
  {
    date: '2026-03-19',
    title: 'Email notifications',
    description:
      "Never miss a booking again. A short morning email lists everyone arriving tomorrow and every assignment ending — so you can prep, clean, or follow up. Public bookings trigger an instant inbox alert the moment someone reserves a desk. Turn any email off from Settings whenever you want quiet.",
    tags: ['Notifications'],
    linkedFeature: 'notifications',
  },
  {
    date: '2026-03-17',
    title: 'Meeting room hourly grid',
    description:
      "Book meeting rooms the way operators actually think about them — by the hour, across every room, at once. The new grid shows every room side-by-side in 30-minute slots from 8 am to 8 pm. Double-booking is impossible. Prices fill in automatically from each room's hourly rate. Meeting-room revenue rolls up into its own line in the Revenue dashboard, so you know exactly which rooms earn their keep.",
    tags: ['Meeting rooms'],
    linkedFeature: 'meeting-rooms',
  },
  {
    date: '2026-03-13',
    title: 'Public booking page',
    description:
      "Turn your Instagram bio, website, or WhatsApp into a booking funnel. Share one link and anyone can book a hot desk in two taps — pick a date, leave a name and phone, done. No account, no password, no app install. You get an instant Telegram ping the moment they book. Low-availability dates show 'Only 2 left' to convert fence-sitters.",
    tags: ['Public booking'],
    linkedFeature: 'public-booking',
  },
  {
    date: '2026-03-07',
    title: 'Telegram notifications',
    description:
      "Get booking updates where you actually read messages — on Telegram. Link your account once in Settings and you'll see a morning summary of tomorrow's arrivals and assignments ending, plus instant pings when a visitor books through your public link. No new app to install, no notification fatigue.",
    tags: ['Notifications'],
    linkedFeature: 'notifications',
  },
];
