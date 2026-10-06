import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const axeRules = ['color-contrast', 'region', 'page-has-heading-one', 'landmark-one-main'];

test.describe('Accessibility Checks', () => {
  const login = async (page) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/dashboard');
  };

  test('Login Page', async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    const results = await new AxeBuilder({ page }).disableRules(axeRules).analyze();
    expect(results.violations).toEqual([]);
  });

  test('Register Page', async ({ page }) => {
    await page.goto('http://localhost:5173/register');
    const results = await new AxeBuilder({ page }).disableRules(axeRules).analyze();
    expect(results.violations).toEqual([]);
  });

  test('Dashboard Page', async ({ page }) => {
    await login(page);
    const results = await new AxeBuilder({ page }).disableRules(axeRules).analyze();
    expect(results.violations).toEqual([]);
  });

  test('Assessment Wizard', async ({ page }) => {
    await login(page);
    await page.goto('http://localhost:5173/assessment/new');
    const results = await new AxeBuilder({ page }).disableRules(axeRules).analyze();
    expect(results.violations).toEqual([]);
  });

  test('Records List', async ({ page }) => {
    await login(page);
    await page.goto('http://localhost:5173/records');
    const results = await new AxeBuilder({ page }).disableRules(axeRules).analyze();
    expect(results.violations).toEqual([]);
  });
});
