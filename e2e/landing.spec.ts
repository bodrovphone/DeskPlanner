import { test, expect } from './fixtures';

/**
 * E2E tests for the OhMyDesk landing page (https://ohmydesk.app).
 *
 * TEST PLAN:
 *
 * 1. Page load & meta
 *    - Page loads successfully (200)
 *    - Title contains "OhMyDesk"
 *    - Meta description is present
 *    - OG tags are set
 *
 * 2. Navigation bar
 *    - Logo is visible
 *    - "Log In" link points to /login
 *    - "Sign Up Free" link points to /signup
 *
 * 3. Hero section
 *    - Typing animation text eventually renders
 *    - "Start Free" CTA links to /signup
 *    - "Log In" CTA links to /login
 *    - Beta badge is visible
 *
 * 4. Social proof stats
 *    - Stats section with key numbers is visible
 *
 * 5. Product showcase
 *    - Faux calendar grid renders with desk names
 *    - Stats cards (Available, Booked, Assigned) appear
 *    - Revenue card shows dollar amount
 *
 * 6. Features section
 *    - All 4 feature cards render (Visual Calendar, Revenue Tracking, Waiting List, Multi-Room Control)
 *
 * 7. Notifications section
 *    - Telegram card shows "Live" badge
 *    - Email, WhatsApp, SMS cards show "Coming Soon"
 *
 * 8. How It Works section
 *    - 3 steps render (Create your space, Manage bookings, Grow revenue)
 *
 * 9. Pricing section
 *    - Free, Pro, Enterprise tiers render
 *    - Pro card shows early bird price ($18)
 *    - Enterprise CTA is disabled
 *
 * 10. Bottom CTA
 *     - "Get Started Free" button links to /signup
 *
 * 11. Footer
 *     - LinkedIn link points to correct URL
 *     - Copyright notice is present
 *
 * 12. Umami analytics
 *     - Analytics script tag is present in <head>
 */

test.describe('Landing page — load & meta', () => {
  test('page loads with correct title and meta tags', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle(/OhMyDesk/);

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /coworking/i);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /OhMyDesk/);
  });
});

test.describe('Landing page — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('logo is visible in nav', async ({ page }) => {
    const logo = page.locator('nav img[alt="OhMyDesk"]');
    await expect(logo).toBeVisible();
  });

  test('nav has Log In and Sign Up links', async ({ page }) => {
    const loginLink = page.locator('nav a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toContainText('Log In');

    const signupLink = page.locator('nav a[href="/signup"]');
    await expect(signupLink).toBeVisible();
    await expect(signupLink).toContainText('Sign Up Free');
  });
});

test.describe('Landing page — hero section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero typing animation renders full text', async ({ page }) => {
    // Wait for typing animation to complete (text + delay ~3s)
    await expect(page.getByText('Desk management for operators who ship.')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('beta badge is visible', async ({ page }) => {
    await expect(page.getByText('Now in public beta')).toBeVisible();
  });

  test('hero CTAs link correctly', async ({ page }) => {
    const startFree = page.locator('section a[href="/signup"]').first();
    await expect(startFree).toBeVisible({ timeout: 5_000 });

    const heroLogin = page.locator('section a[href="/login"]').first();
    await expect(heroLogin).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Landing page — social proof', () => {
  test('stats section shows key numbers', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('2,400+')).toBeVisible();
    await expect(page.getByText('340+')).toBeVisible();
    await expect(page.getByText('99.9%')).toBeVisible();
    await expect(page.getByText('<2min')).toBeVisible();
  });
});

test.describe('Landing page — product showcase', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('faux calendar renders desk rows', async ({ page }) => {
    await expect(page.getByText('Room 1 / Desk 1')).toBeVisible();
    await expect(page.getByText('Room 2 / Desk 4')).toBeVisible();
  });

  test('stats cards render', async ({ page }) => {
    await expect(page.getByText('Available')).toBeVisible();
    await expect(page.getByText('Booked')).toBeVisible();
    await expect(page.getByText('Assigned')).toBeVisible();
  });

  test('revenue card shows amount', async ({ page }) => {
    await expect(page.getByText('$4,280')).toBeVisible();
    await expect(page.getByText('Monthly Revenue')).toBeVisible();
  });
});

test.describe('Landing page — features', () => {
  test('all 4 feature cards render', async ({ page }) => {
    await page.goto('/');

    for (const title of ['Visual Calendar', 'Revenue Tracking', 'Waiting List', 'Multi-Room Control']) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
  });
});

test.describe('Landing page — notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Telegram card shows Live badge', async ({ page }) => {
    const telegramCard = page.getByText('LiveTelegramDaily alerts for', { exact: false });
    await expect(telegramCard).toBeVisible();
    await expect(page.getByText('Live', { exact: true })).toBeVisible();
  });

  test('coming soon channels are listed', async ({ page }) => {
    for (const channel of ['Email', 'WhatsApp', 'SMS']) {
      await expect(page.getByText(channel, { exact: true })).toBeVisible();
    }
  });
});

test.describe('Landing page — how it works', () => {
  test('3 steps render', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Create your space')).toBeVisible();
    await expect(page.getByText('Manage bookings')).toBeVisible();
    await expect(page.getByText('Grow revenue')).toBeVisible();
  });
});

test.describe('Landing page — pricing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('all 3 tiers render', async ({ page }) => {
    // Pricing card names
    for (const tier of ['Free', 'Pro', 'Enterprise']) {
      await expect(page.getByText(tier, { exact: true }).first()).toBeVisible();
    }
  });

  test('Pro tier shows early bird price', async ({ page }) => {
    await expect(page.getByText('$18')).toBeVisible();
  });

  test('Enterprise CTA links to LinkedIn', async ({ page }) => {
    const contactLink = page.locator('a[href="https://www.linkedin.com/company/ohmydesk-app"]', { has: page.getByText('Contact Us') });
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveAttribute('target', '_blank');
  });

  test('Enterprise card shows custom integrations footnote', async ({ page }) => {
    await expect(page.getByText('* We build custom')).toBeVisible();
  });
});

test.describe('Landing page — integrations', () => {
  test('integration badges render', async ({ page }) => {
    await page.goto('/');

    for (const name of ['Telegram', 'Slack', 'Stripe', 'Shopify', 'Google Calendar', 'Zapier', 'QuickBooks', 'HubSpot']) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test('custom integration tagline is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText("Don't see yours?")).toBeVisible();
  });
});

test.describe('Landing page — bottom CTA', () => {
  test('"Get Started Free" links to signup', async ({ page }) => {
    await page.goto('/');

    const cta = page.getByRole('button', { name: /Get Started Free/i });
    await expect(cta).toBeVisible();

    const link = page.locator('a[href="/signup"]', { has: cta });
    await expect(link).toBeVisible();
  });
});

test.describe('Landing page — footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('LinkedIn link is correct', async ({ page }) => {
    const linkedin = page.locator('footer a[href="https://www.linkedin.com/company/ohmydesk-app"]');
    await expect(linkedin).toBeVisible();
    await expect(linkedin).toHaveAttribute('target', '_blank');
  });

  test('copyright notice is present', async ({ page }) => {
    await expect(page.getByText(/© \d{4} OhMyDesk/)).toBeVisible();
  });
});

test.describe('Landing page — analytics', () => {
  test('Umami script is loaded', async ({ page }) => {
    await page.goto('/');

    const umamiScript = page.locator('script[src="https://ohmydesk-analytics.bodrovphone.workers.dev/s.js"]');
    await expect(umamiScript).toHaveAttribute('data-website-id', '1f5154a8-b100-4034-8bf9-ed3bf8399f9a');
  });
});
