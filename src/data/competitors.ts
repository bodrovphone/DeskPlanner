// Competitor comparison data. Each entry drives a `/compare/[slug]/` page.
// Source of truth: docs/marketing/competitor-research.md (verified April 14, 2026).
// Update `pricingSource` when re-verified. Do not add claims not in the research doc.

export type FeatureCell = boolean | string;

export interface ComparisonRow<T = string> {
  label: string;
  theirs: T;
  ours: T;
}

export interface FeatureRow {
  feature: string;
  theirs: FeatureCell;
  ours: FeatureCell;
}

export interface Competitor {
  slug: string;
  name: string;
  tagline: string;
  theirPricingSummary: string;
  theirWeakness: string;
  idealSwitcher: string;
  pricingRows: ComparisonRow[];
  featureRows: FeatureRow[];
  honestGaps: string[];
  pricingSource: string;
  metaTitle: string;
  metaDescription: string;
}

const VERIFIED = 'verified April 14, 2026';

export const competitors: Competitor[] = [
  {
    slug: 'cobot',
    name: 'Cobot',
    tagline: 'Cobot\'s price grows with your member count. OhMyDesk stays at $18/mo.',
    theirPricingSummary: 'From €54/month for 10 paying members (annual billing). ~€120+/month at 50 members. Processing fees: 9% external bookings, 5% drop-ins, 3% event tickets.',
    theirWeakness: 'Per-paying-member pricing plus processing fees on drop-ins means your bill grows in two directions: more members AND more bookings.',
    idealSwitcher: 'Small to mid coworking spaces (10-50 desks) who don\'t want software costs to grow linearly with their community. OhMyDesk is $18/mo flat whether you have 5 members or 500, and we never take a cut of your bookings.',
    pricingRows: [
      { label: 'Starting price (annual billing)', theirs: '€54/mo (10 members)', ours: '$18/mo' },
      { label: 'Cost at ~50 paying members', theirs: '~€120+/mo', ours: '$18/mo' },
      { label: 'Drop-in processing fee', theirs: '5%', ours: '0%' },
      { label: 'External booking processing fee', theirs: '9%', ours: '0%' },
      { label: 'Event ticket fee', theirs: '3%', ours: '0%' },
      { label: 'Free trial', theirs: '30 days', ours: '3 months' },
      { label: 'Credit card required to start', theirs: 'Yes', ours: 'No' },
    ],
    featureRows: [
      { feature: 'Visual desk booking calendar', theirs: true, ours: true },
      { feature: 'Member management', theirs: true, ours: true },
      { feature: 'Meeting room hourly booking', theirs: true, ours: true },
      { feature: 'Public booking page', theirs: true, ours: true },
      { feature: 'Flex day packages', theirs: true, ours: true },
      { feature: 'Interactive floor plan editor', theirs: false, ours: true },
      { feature: 'Multi-location support', theirs: true, ours: 'On $50 plan' },
      { feature: 'White-label member mobile app', theirs: true, ours: false },
      { feature: 'Community features (chats, events feed)', theirs: 'Limited', ours: false },
      { feature: '100+ third-party integrations', theirs: true, ours: 'Limited' },
      { feature: 'Access control integrations', theirs: true, ours: false },
    ],
    honestGaps: [
      'Cobot has a white-label mobile app for members. OhMyDesk is responsive web only.',
      'Cobot has 100+ integrations (Slack, Xero, HubSpot, access control). OhMyDesk has fewer today.',
      'Cobot has a mature member-facing portal with community tools. OhMyDesk focuses on the operator workflow.',
    ],
    pricingSource: `Cobot public pricing page, ${VERIFIED}`,
    metaTitle: 'Cobot Alternative — OhMyDesk vs Cobot Pricing & Features',
    metaDescription: 'Honest comparison of OhMyDesk vs Cobot. $18/mo flat with zero booking fees, vs Cobot\'s per-member pricing plus 3-9% processing fees. Same core features, a fraction of the cost.',
  },
  {
    slug: 'officernd',
    name: 'OfficeRnD',
    tagline: 'OfficeRnD hides its pricing behind a demo. OhMyDesk is $18/mo, self-serve.',
    theirPricingSummary: 'No public pricing — demo required for every plan. Estimated entry ~$149/month (Start plan) based on site hints. 3-tier structure: Start / Grow / Scale.',
    theirWeakness: 'Demo-gated pricing means you can\'t evaluate cost until a sales call. That\'s fine for 200-member spaces — painful for a 10-desk operator who just wants to know the number.',
    idealSwitcher: 'Coworking operators under 50 desks who\'d rather see a price and sign up today than book a demo and wait for a quote. OhMyDesk is $18/mo, published on the pricing page, with no onboarding fee and no contract.',
    pricingRows: [
      { label: 'Starting price', theirs: '~$149+/mo (estimate)', ours: '$18/mo' },
      { label: 'Published pricing', theirs: 'No — demo required', ours: 'Yes' },
      { label: 'Free trial', theirs: '3 months (switchers only)', ours: '3 months, anyone' },
      { label: 'Onboarding fee', theirs: 'Custom quote', ours: 'None' },
      { label: 'Credit card to start', theirs: 'Demo required first', ours: 'No' },
      { label: 'Contract', theirs: 'Typically annual', ours: 'Month-to-month' },
    ],
    featureRows: [
      { feature: 'Visual desk booking calendar', theirs: true, ours: true },
      { feature: 'Member management & contracts', theirs: true, ours: true },
      { feature: 'Meeting room booking', theirs: true, ours: true },
      { feature: 'Public / self-serve booking', theirs: true, ours: true },
      { feature: 'Flex day packages', theirs: true, ours: true },
      { feature: 'Floor plans', theirs: true, ours: true },
      { feature: 'Multi-location', theirs: true, ours: 'On $50 plan' },
      { feature: 'Xero / QuickBooks / HubSpot / Slack', theirs: true, ours: false },
      { feature: 'White-label member app', theirs: 'Add-on', ours: false },
      { feature: 'Self-serve signup (no demo)', theirs: false, ours: true },
      { feature: 'Published pricing', theirs: false, ours: true },
    ],
    honestGaps: [
      'OfficeRnD has deep accounting integrations (Xero, QuickBooks). OhMyDesk has Stripe for payments but no accounting sync yet.',
      'OfficeRnD has a branded member-app add-on. OhMyDesk has responsive web only.',
      'OfficeRnD\'s Growth Hub has dynamic pricing and promo codes. OhMyDesk doesn\'t — yet.',
    ],
    pricingSource: `OfficeRnD public pricing page, ${VERIFIED} (no prices published — estimates sourced from their site)`,
    metaTitle: 'OfficeRnD Alternative — OhMyDesk vs OfficeRnD',
    metaDescription: 'OhMyDesk vs OfficeRnD. $18/mo self-serve with published pricing, vs OfficeRnD\'s demo-gated quotes estimated at $149+/mo. No sales call required.',
  },
  {
    slug: 'nexudus',
    name: 'Nexudus',
    tagline: 'Nexudus is built for enterprise. OhMyDesk is built for your 10 desks.',
    theirPricingSummary: 'From $150/month (Coworking Professional, up to ~79 active users), scaling to $525/month at 499 users. White-label app: +$150/month.',
    theirWeakness: 'A $150/mo floor and an "active user" definition that includes anyone who made a booking in the last 30 days means cost creeps up fast and is hard to predict.',
    idealSwitcher: 'Operators running a simple, independent space who don\'t need CRM pipelines, ledger accounting, AI help-desk, or branded tablet apps. If you\'re spending 5 minutes a day on admin, Nexudus is overkill.',
    pricingRows: [
      { label: 'Starting price', theirs: '$150/mo', ours: '$18/mo' },
      { label: 'Cost at 100 active users', theirs: '~$200+/mo', ours: '$18/mo' },
      { label: 'White-label member app', theirs: '+$150/mo', ours: 'Not offered' },
      { label: 'Free trial', theirs: 'None public', ours: '3 months, no card' },
      { label: 'Setup complexity', theirs: 'High', ours: 'Under 2 minutes' },
      { label: 'Credit card to start', theirs: 'Quote required', ours: 'No' },
    ],
    featureRows: [
      { feature: 'Visual desk booking', theirs: true, ours: true },
      { feature: 'Member management & billing', theirs: true, ours: true },
      { feature: 'Meeting room booking', theirs: true, ours: true },
      { feature: 'Floor plans', theirs: true, ours: true },
      { feature: 'Built-in CRM (opportunities, tasks)', theirs: true, ours: false },
      { feature: 'AI help-desk', theirs: true, ours: false },
      { feature: 'Accounting ledger (ACH, direct debit)', theirs: true, ours: 'Stripe only' },
      { feature: 'Room panels (NexBoard tablet app)', theirs: true, ours: false },
      { feature: 'Visitor app & delivery app', theirs: true, ours: false },
      { feature: 'Public booking page', theirs: 'Limited', ours: true },
      { feature: 'Setup under 2 minutes', theirs: false, ours: true },
    ],
    honestGaps: [
      'Nexudus has a built-in CRM with opportunity pipelines, tasks, and reminders. OhMyDesk has a flat member list.',
      'Nexudus has dedicated room-panel tablets (NexBoard), a visitor app (NexIO), and a delivery app (NexDelivery). OhMyDesk doesn\'t.',
      'Nexudus has ledger-grade accounting with ACH and direct-debit. OhMyDesk integrates with Stripe only.',
    ],
    pricingSource: `Nexudus public pricing page, ${VERIFIED}`,
    metaTitle: 'Nexudus Alternative — OhMyDesk vs Nexudus',
    metaDescription: 'OhMyDesk vs Nexudus. $18/mo for independent spaces, vs Nexudus starting at $150/mo built for enterprise coworking chains. Core booking & billing, none of the enterprise complexity.',
  },
  {
    slug: 'spacebring',
    name: 'Spacebring',
    tagline: 'Spacebring charges $187/mo and a 6-month commitment. OhMyDesk is $18/mo, month-to-month.',
    theirPricingSummary: '$187/month (€158) Business plan with 100 users, 1 location, 6-month minimum. +$89/mo per 50 additional users. +$106/mo per additional location. Add-ons: white-label app $118/mo, visitors $59/mo, floor plans $30/mo, API $30/mo.',
    theirWeakness: 'A 6-month minimum commitment plus auto-added fees at 101 users and mandatory add-ons for basic features (visitors, floor plans, API) means the advertised $187 isn\'t what you\'ll actually pay.',
    idealSwitcher: 'New or early-stage operators who don\'t want to sign a 6-month contract on day one. OhMyDesk is month-to-month, 3 months free, cancel whenever.',
    pricingRows: [
      { label: 'Entry price', theirs: '$187/mo', ours: '$18/mo' },
      { label: 'Minimum commitment', theirs: '6 months', ours: 'None' },
      { label: 'Cost at 150 users', theirs: '$187 + $89 = $276/mo', ours: '$18/mo' },
      { label: 'Visitor check-in', theirs: '+$59/mo add-on', ours: 'Not offered' },
      { label: 'Floor plans', theirs: '+$30/mo add-on', ours: 'Included' },
      { label: 'White-label member app', theirs: '+$118/mo', ours: 'Not offered' },
      { label: 'Free trial', theirs: '7 days', ours: '3 months' },
    ],
    featureRows: [
      { feature: 'Visual desk & room booking', theirs: true, ours: true },
      { feature: 'Member billing & invoicing', theirs: true, ours: true },
      { feature: 'Floor plans', theirs: 'Add-on', ours: true },
      { feature: 'Member community (chats, events, shop)', theirs: true, ours: false },
      { feature: 'eSignature for contracts', theirs: 'Pay per signing', ours: false },
      { feature: 'API & webhooks', theirs: 'Add-on $30/mo', ours: 'Limited' },
      { feature: '10+ interface languages', theirs: true, ours: false },
      { feature: 'Month-to-month contract', theirs: false, ours: true },
      { feature: 'Free trial without commitment', theirs: '7 days', ours: '3 months' },
    ],
    honestGaps: [
      'Spacebring has member chats, an event feed, and a benefits/shop catalog. OhMyDesk is operator-focused, not member-social.',
      'Spacebring has pay-per-use eSignature for membership contracts. OhMyDesk doesn\'t.',
      'Spacebring has 10+ interface languages with AI translation. OhMyDesk is English-only for now.',
    ],
    pricingSource: `Spacebring public pricing page, ${VERIFIED}`,
    metaTitle: 'Spacebring Alternative — OhMyDesk vs Spacebring',
    metaDescription: 'OhMyDesk vs Spacebring. $18/mo month-to-month, vs Spacebring\'s $187/mo with 6-month commitment and stacked add-ons. Simple price, no minimums.',
  },
  {
    slug: 'archie',
    name: 'Archie',
    tagline: 'Archie was built for corporate offices. OhMyDesk was built for your independent coworking space.',
    theirPricingSummary: 'Starter $165/month (100 active members, 1 location). Pro $257/month (200 members, 2 locations). Extra 50 members: +$50/mo. Extra location: +$90/mo.',
    theirWeakness: 'Archie is polished — but it\'s built for corporate facility managers running Microsoft Teams-integrated hot-desking. It has no built-in member billing and no community features. Not a coworking tool in the independent sense.',
    idealSwitcher: 'Independent coworking operators who need to actually invoice members (Archie doesn\'t). OhMyDesk includes member billing, flex day packages, and public drop-in booking out of the box.',
    pricingRows: [
      { label: 'Starting price', theirs: '$165/mo', ours: '$18/mo' },
      { label: 'Cost at 150 members', theirs: '$165 + $50 = $215/mo', ours: '$18/mo' },
      { label: 'Member billing & invoicing', theirs: 'Not included', ours: 'Included' },
      { label: 'Free trial', theirs: '14 days (after demo)', ours: '3 months, no demo' },
      { label: 'White-label app', theirs: '+$90/mo per location', ours: 'Not offered' },
      { label: 'Contract', theirs: 'Annual typical', ours: 'Month-to-month' },
    ],
    featureRows: [
      { feature: 'Visual desk booking', theirs: true, ours: true },
      { feature: 'Floor plans with check-in', theirs: true, ours: true },
      { feature: 'Member billing & invoicing', theirs: false, ours: true },
      { feature: 'Flex day packages', theirs: false, ours: true },
      { feature: 'Public drop-in booking', theirs: false, ours: true },
      { feature: 'Microsoft Teams / Outlook integration', theirs: 'Pro plan', ours: false },
      { feature: 'SSO / SCIM (user provisioning)', theirs: 'Pro plan', ours: false },
      { feature: 'Community features', theirs: false, ours: false },
      { feature: 'Occupancy analytics', theirs: true, ours: true },
    ],
    honestGaps: [
      'Archie has deep Microsoft 365 integration — members can book from Teams or Outlook. OhMyDesk doesn\'t.',
      'Archie has SSO and SCIM for enterprise IT provisioning. OhMyDesk is email + password.',
      'Archie has won G2 awards for usability. OhMyDesk is young and rough in places.',
    ],
    pricingSource: `Archie public pricing page, ${VERIFIED}`,
    metaTitle: 'Archie Alternative — OhMyDesk vs Archie for Coworking',
    metaDescription: 'OhMyDesk vs Archie. Archie is built for corporate hot-desking with Microsoft Teams; OhMyDesk is built for independent coworking with member billing, flex plans, and public booking.',
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}

export function getOtherCompetitors(slug: string): Competitor[] {
  return competitors.filter((c) => c.slug !== slug);
}
