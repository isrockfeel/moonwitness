import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/MoonWitness/);
  });

  test('should navigate to setup page', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.locator('h1')).toContainText('Setup');
  });

  test('should show VPN page', async ({ page }) => {
    await page.goto('/vpn');
    await expect(page.locator('h1')).toContainText(/VPN|WireGuard/i);
  });
});

test.describe('VPN Setup Flow', () => {
  test('should display VPN setup page', async ({ page }) => {
    await page.goto('/setup');
    await expect(page.locator('text=/WireGuard|VPN/i')).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should load dashboard page', async ({ page }) => {
    await page.goto('/mission-control');
    await expect(page.locator('h1')).toContainText('Mission Control');
  });

  test('should display dock', async ({ page }) => {
    await page.goto('/dock');
    await expect(page.locator('text=Dock')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should navigate between main pages', async ({ page }) => {
    const pages = [
      { path: '/', title: /MoonWitness/ },
      { path: '/vpn', title: /VPN/i },
      { path: '/setup', title: /Setup/ },
      { path: '/mission-control', title: /Mission Control/i },
      { path: '/dock', title: /Dock/i },
    ];

    for (const { path, title } of pages) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    }
  });
});