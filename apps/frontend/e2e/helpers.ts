import { Page, expect } from '@playwright/test';

/**
 * Helper function to set the user's name and join/create a session
 */
export async function setUserName(page: Page, name: string) {
  // Wait for the name dialog to appear
  const nameInput = page.locator('input[placeholder="Please Enter Name"]');
  await expect(nameInput).toBeVisible({ timeout: 10000 });

  // Enter the name
  await nameInput.fill(name);

  // Click the Continue button
  const continueButton = page.locator('button[data-automation-id="create-modal-save"]');
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // Wait for dialog to close
  await expect(nameInput).not.toBeVisible();
}

/**
 * Helper function to extract session ID from URL
 */
export function getSessionIdFromUrl(url: string): string {
  const match = url.match(/\/session\/([^\/\?]+)/);
  return match ? match[1] : '';
}

/**
 * Helper function to wait for WebSocket connection
 */
export async function waitForWebSocketConnection(page: Page) {
  // Wait for connection status indicator to show connected state
  await page.waitForTimeout(1000); // Give WebSocket time to connect
}

/**
 * Helper function to select a point value
 */
export async function selectPointValue(page: Page, value: string) {
  const button = page.locator(`button.point-card[aria-label="${value} points"]`);
  await expect(button).toBeVisible();
  await button.click();
}

/**
 * Helper function to click "Show Votes" button
 */
export async function showVotes(page: Page) {
  const showButton = page.locator('button:has-text("Show Votes")');
  await expect(showButton).toBeVisible();
  await showButton.click();
}

/**
 * Helper function to click "Clear Votes" button
 */
export async function clearVotes(page: Page) {
  const clearButton = page.locator('button:has-text("Clear Votes")');
  await expect(clearButton).toBeVisible();
  await clearButton.click();
}
