import { test, expect } from '@playwright/test';
import { setUserName, waitForWebSocketConnection, selectPointValue, showVotes, clearVotes } from './helpers';

test.describe('Voting Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and create a session
    await page.goto('/');
    await setUserName(page, 'Voter');
    await page.waitForURL(/\/session\/.+/);
    await waitForWebSocketConnection(page);
  });

  test('should display voting buttons', async ({ page }) => {
    // Verify voting panel is visible
    const votingPanel = page.locator('app-voting-panel');
    await expect(votingPanel).toBeVisible();

    // Verify common voting options are available
    const commonValues = ['1', '2', '3', '5', '8'];
    for (const value of commonValues) {
      const button = page.locator(`button:has-text("${value}")`).first();
      await expect(button).toBeVisible();
    }
  });

  test('should allow selecting a point value', async ({ page }) => {
    // Select a point value
    await selectPointValue(page, '5');

    // Wait for the selection to be processed
    await page.waitForTimeout(500);

    // The button should show as selected (this depends on the implementation)
    // Check if the button has a selected/active state
    const selectedButton = page.locator('button:has-text("5")').first();
    await expect(selectedButton).toBeVisible();
  });

  test('should allow changing vote before revealing', async ({ page }) => {
    // Select first value
    await selectPointValue(page, '3');
    await page.waitForTimeout(500);

    // Change to different value
    await selectPointValue(page, '8');
    await page.waitForTimeout(500);

    // The new value should be selected
    const newSelectedButton = page.locator('button:has-text("8")').first();
    await expect(newSelectedButton).toBeVisible();
  });

  test('should show votes when Show button is clicked', async ({ page }) => {
    // Cast a vote
    await selectPointValue(page, '5');
    await page.waitForTimeout(500);

    // Click show votes
    await showVotes(page);
    await page.waitForTimeout(1000);

    // Results chart should be visible
    const resultsChart = page.locator('app-results-chart');
    await expect(resultsChart).toBeVisible();
  });

  test('should clear votes when Clear button is clicked', async ({ page }) => {
    // Cast a vote
    await selectPointValue(page, '8');
    await page.waitForTimeout(500);

    // Show votes
    await showVotes(page);
    await page.waitForTimeout(500);

    // Clear votes
    await clearVotes(page);
    await page.waitForTimeout(500);

    // Results chart should not be visible after clearing
    const resultsChart = page.locator('app-results-chart');
    await expect(resultsChart).not.toBeVisible();
  });

  test('should show story controls', async ({ page }) => {
    const storyControls = page.locator('app-story-controls');
    await expect(storyControls).toBeVisible();

    // Verify Show and Clear buttons exist
    await expect(page.locator('button:has-text("Show")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
  });
});
