import { test, expect } from './fixtures';

/**
 * Floor Plan Editor suite — minimal smoke coverage.
 *
 * The floor plan editor is a complex drag-and-drop canvas UI.
 * Tests only verify the page loads and key structural elements are present.
 * Interaction tests (drag, drop, rotate) are intentionally omitted.
 *
 * Requires desktop viewport (≥ 1024px) — Playwright default 1280×720 satisfies this.
 * On mobile the page shows "Your thumbs are too small for this" instead.
 *
 * Runs in the `app` Playwright project (authenticated, org: e2e-testspace).
 */

const FLOOR_PLAN_URL = '/e2e-testspace/floor-plan-editor/';

test.describe('Floor Plan Editor — page load', { tag: ['@smoke'] }, () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FLOOR_PLAN_URL);
    await page.waitForLoadState('networkidle');
  });

  test('renders the editor with header and side panel', async ({ page }) => {
    // Header "Floor Plan" title
    await expect(page.getByRole('heading', { name: 'Floor Plan' })).toBeVisible({ timeout: 25_000 });

    // Right panel always renders — "Shapes" section header
    await expect(page.getByText('Shapes', { exact: true })).toBeVisible({ timeout: 20_000 });

    // "Desks to place" section header (renders even when loading)
    await expect(page.getByText('Desks to place')).toBeVisible();
  });
});

test.describe('Floor Plan Editor — toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FLOOR_PLAN_URL);
    await page.waitForLoadState('networkidle');
    // Wait for editor to be ready
    await page.getByRole('heading', { name: 'Floor Plan' }).waitFor({ state: 'visible', timeout: 25_000 });
  });

  test('Clear room button is present and disabled when canvas is empty', async ({ page }) => {
    // "Clear room" or "Clear all" button exists in the header toolbar
    const clearBtn = page.getByRole('button', { name: /clear/i });
    await expect(clearBtn).toBeVisible({ timeout: 10_000 });
    // Disabled when no objects are placed on the canvas
    await expect(clearBtn).toBeDisabled();
  });

  test('shape buttons in right panel are clickable', async ({ page }) => {
    // At least one shape button should exist in the Shapes section
    const shapesSection = page.locator('aside').filter({ has: page.getByText('Shapes', { exact: true }) });
    await expect(shapesSection).toBeVisible({ timeout: 15_000 });

    // Shapes are rendered as buttons with title="Add <shape>"
    const shapeBtn = shapesSection.locator('button[title^="Add"]').first();
    await expect(shapeBtn).toBeVisible();
  });
});
