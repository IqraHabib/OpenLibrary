import { expect, type Page } from '@playwright/test';
import BasePage from './BasePage';
import SearchResultsPage from './SearchResultsPage';

export default class HomePage extends BasePage {
  readonly searchInput = this.page.getByRole('textbox', { name: /search/i });
  readonly searchButton = this.page.getByRole('button', { name: 'Search' });
  readonly pageHeading = this.page.getByRole('heading', { level: 1 });

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    console.log('🌐 Navigating to OpenLibrary homepage...');
    const startTime = Date.now();
    await this.goto('https://openlibrary.org/');
    await this.page.waitForLoadState('networkidle');
    await this.searchInput.waitFor({ state: 'visible', timeout: 30000 });
    const loadTime = Date.now() - startTime;
    console.log(`⏱️  Page fully loaded in ${loadTime}ms`);
  }

  async search(query: string): Promise<SearchResultsPage> {
    console.log(`🔍 Searching for: "${query}"`);
    const startTime = Date.now();
    await this.searchInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.searchInput.fill(query);
    await Promise.all([
      this.page.waitForURL(/\/search/, { timeout: 30000 }),
      this.searchButton.click({ timeout: 20000 })
    ]);
    await this.page.waitForLoadState('networkidle');
    const searchTime = Date.now() - startTime;
    console.log(`⏱️  Search completed in ${searchTime}ms`);
    return new SearchResultsPage(this.page);
  }

  async expectOpenLibraryHome(): Promise<void> {
    console.log('✅ Verifying homepage elements...');
    await expect(this.page).toHaveURL('https://openlibrary.org/');
    await expect(this.searchInput).toBeVisible();
    console.log('✅ Homepage verification complete');
  }
}
