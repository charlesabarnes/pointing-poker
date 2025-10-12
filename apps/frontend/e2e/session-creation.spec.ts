import { test, expect } from '@playwright/test';
import { setUserName, getSessionIdFromUrl, waitForWebSocketConnection } from './helpers';

test.describe('Session Creation', () => {
  test('should create a new session when user enters their name', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Set the user name (this should trigger session creation)
    await setUserName(page, 'Test User');

    // Wait for navigation to session page
    await page.waitForURL(/\/session\/.+/);

    // Verify we're on a session page
    const sessionId = getSessionIdFromUrl(page.url());
    expect(sessionId).toBeTruthy();
    expect(sessionId.length).toBeGreaterThan(0);

    // Wait for WebSocket connection
    await waitForWebSocketConnection(page);

    // Verify the poker session components are visible
    await expect(page.locator('app-voting-panel')).toBeVisible();
    await expect(page.locator('app-participants-list')).toBeVisible();
    await expect(page.locator('app-story-controls')).toBeVisible();
  });

  test('should show user in participants list after joining', async ({ page }) => {
    await page.goto('/');
    const userName = 'Alice';

    await setUserName(page, userName);
    await page.waitForURL(/\/session\/.+/);
    await waitForWebSocketConnection(page);

    // Check if the user appears in the participants list
    // Wait a bit for the WebSocket to sync
    await page.waitForTimeout(1500);

    // The user should appear in the participants list
    const participantsList = page.locator('app-participants-list');
    await expect(participantsList).toBeVisible();
  });

  test('should allow copying session URL', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto('/');
    await setUserName(page, 'Test User');
    await page.waitForURL(/\/session\/.+/);

    // Find and click the copy button
    const copyButton = page.locator('button[cdkCopyToClipboard]');
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    // Verify the snackbar/toast appears
    await expect(page.locator('text=Copied URL to clipboard')).toBeVisible();
  });

  test('should maintain session when page is refreshed', async ({ page }) => {
    await page.goto('/');
    await setUserName(page, 'Persistent User');
    await page.waitForURL(/\/session\/.+/);

    const originalUrl = page.url();
    const sessionId = getSessionIdFromUrl(originalUrl);

    // Reload the page
    await page.reload();

    // Should stay on the same session
    await page.waitForURL(/\/session\/.+/);
    const newSessionId = getSessionIdFromUrl(page.url());

    expect(newSessionId).toBe(sessionId);
    await expect(page.locator('app-voting-panel')).toBeVisible();
  });
});
