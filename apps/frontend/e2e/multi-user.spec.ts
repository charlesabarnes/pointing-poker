import { test, expect } from '@playwright/test';
import { setUserName, getSessionIdFromUrl, waitForWebSocketConnection, selectPointValue, showVotes } from './helpers';

test.describe('Multi-User Scenarios', () => {
  test('should allow multiple users to join the same session', async ({ browser }) => {
    // Create two separate browser contexts (different users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates a session
      await page1.goto('/');
      await setUserName(page1, 'Alice');
      await page1.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page1);

      const sessionUrl = page1.url();
      const sessionId = getSessionIdFromUrl(sessionUrl);

      // User 2 joins the same session
      await page2.goto(sessionUrl);
      await setUserName(page2, 'Bob');
      await page2.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page2);

      // Both users should see the same session
      const sessionId2 = getSessionIdFromUrl(page2.url());
      expect(sessionId2).toBe(sessionId);

      // Both should see the voting panel
      await expect(page1.locator('app-voting-panel')).toBeVisible();
      await expect(page2.locator('app-voting-panel')).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should sync votes between multiple users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates a session
      await page1.goto('/');
      await setUserName(page1, 'Alice');
      await page1.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page1);

      const sessionUrl = page1.url();

      // User 2 joins the same session
      await page2.goto(sessionUrl);
      await setUserName(page2, 'Bob');
      await page2.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page2);

      // User 1 votes
      await selectPointValue(page1, '5');
      await page1.waitForTimeout(1000);

      // User 2 votes
      await selectPointValue(page2, '8');
      await page2.waitForTimeout(1000);

      // User 1 shows votes
      await showVotes(page1);
      await page1.waitForTimeout(1000);

      // Both users should see the results chart
      await expect(page1.locator('app-results-chart')).toBeVisible();
      await expect(page2.locator('app-results-chart')).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should show participants count with multiple users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // User 1 creates a session
      await page1.goto('/');
      await setUserName(page1, 'Alice');
      await page1.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page1);

      const sessionUrl = page1.url();

      // User 2 joins
      await page2.goto(sessionUrl);
      await setUserName(page2, 'Bob');
      await page2.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page2);

      // User 3 joins
      await page3.goto(sessionUrl);
      await setUserName(page3, 'Charlie');
      await page3.waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(page3);

      // Wait for all participants to sync
      await page1.waitForTimeout(2000);

      // All pages should show the participants list
      await expect(page1.locator('app-participants-list')).toBeVisible();
      await expect(page2.locator('app-participants-list')).toBeVisible();
      await expect(page3.locator('app-participants-list')).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('should handle full team scenario with 5 users voting', async ({ browser }) => {
    // Create 5 separate browser contexts (simulating a full team)
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);

    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const votes = ['3', '5', '5', '8', '5']; // Mix of votes

    try {
      // First user creates the session
      await pages[0].goto('/');
      await setUserName(pages[0], users[0]);
      await pages[0].waitForURL(/\/session\/.+/);
      await waitForWebSocketConnection(pages[0]);

      const sessionUrl = pages[0].url();

      // All other users join the same session
      for (let i = 1; i < users.length; i++) {
        await pages[i].goto(sessionUrl);
        await setUserName(pages[i], users[i]);
        await pages[i].waitForURL(/\/session\/.+/);
        await waitForWebSocketConnection(pages[i]);
      }

      // Wait for all participants to sync
      await pages[0].waitForTimeout(2000);

      // All users cast their votes
      for (let i = 0; i < users.length; i++) {
        await selectPointValue(pages[i], votes[i]);
        await pages[i].waitForTimeout(500);
      }

      // Wait for votes to sync
      await pages[0].waitForTimeout(1000);

      // First user reveals the votes
      await showVotes(pages[0]);
      await pages[0].waitForTimeout(1500);

      // All users should see the results chart
      for (let i = 0; i < users.length; i++) {
        await expect(pages[i].locator('app-results-chart')).toBeVisible({ timeout: 5000 });
      }

      // Verify the chart is showing results (chart canvas should be visible)
      for (let i = 0; i < users.length; i++) {
        const chartCanvas = pages[i].locator('canvas[basechart]');
        await expect(chartCanvas).toBeVisible();
      }

      // Test clearing votes with multiple users
      await clearVotes(pages[0]);
      await pages[0].waitForTimeout(1500);

      // Chart should not be visible after clearing
      for (let i = 0; i < users.length; i++) {
        await expect(pages[i].locator('app-results-chart')).not.toBeVisible();
      }

      // Verify voting panel is still available for next round
      for (let i = 0; i < users.length; i++) {
        await expect(pages[i].locator('app-voting-panel')).toBeVisible();
      }
    } finally {
      // Close all contexts
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
  });
});
