import { expect, type Page } from '@playwright/test';
import BasePage from './BasePage';

export default class SearchResultsPage extends BasePage {
  readonly resultsContainer = this.page.locator('ul.search-results');
  readonly resultItems = this.page.locator('a[itemprop="url"].results');
  readonly searchQueryDisplay = this.page.locator('.search-query, .query-display');
  readonly nextPageButton = this.page.getByRole('link', { name: 'Go to page 2', exact: true });
  readonly verifyHumanButton = this.page.getByRole('button', { name: /verify/i });
  readonly sortDropdown = this.page.locator('summary.tool-button');
  readonly firstPublishedOption = this.page.locator('a[data-ol-link-track="SearchSort|Old"]');
  readonly pageHeading = this.page.locator('h1');
  readonly languageSelectorButton = this.page.locator('.language-component.header-dropdown summary');
  readonly spanishLanguageFilter = this.page.locator('a[data-lang-id="es"]');

  constructor(page: Page) {
    super(page);
  }

  async expectSearchResultsVisible(): Promise<void> {
    console.log('📋 Checking search results visibility...');
    await expect(this.page).toHaveURL(/\/search/);
    await this.resultItems.first().waitFor({ state: 'visible', timeout: 30000 });
    console.log('✅ Search results page confirmed');
  }

  async expectResultsContainText(text: string): Promise<void> {
    await expect(this.resultItems.first()).toContainText(text);
  }

  async getResultCount(): Promise<number> {
    return await this.resultItems.count();
  }

  async getFirstResultText(): Promise<string> {
    const firstResult = this.resultItems.first();
    await firstResult.waitFor({ state: 'visible', timeout: 10000 });
    const text = await firstResult.innerText();
    return text.trim();
  }

  async getAllResultTitles(): Promise<string[]> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('a[itemprop="url"].results', { state: 'visible', timeout: 30000 });
    const titles = await this.page.locator('a[itemprop="url"].results').allTextContents();
    return titles.map(title => title.trim()).filter(title => title.length > 0);
  }

  async sortByFirstPublished(): Promise<void> {
    console.log('📊 Opening Relevance dropdown...');
    await this.sortDropdown.click();
    console.log('📊 Clicking First published...');
    await Promise.all([
      this.page.waitForURL(/sort=ol/, { timeout: 30000 }),
      this.firstPublishedOption.click()
    ]);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('a[itemprop="url"].results', { state: 'visible', timeout: 30000 });
    console.log('✅ Results sorted by First published');
  }

  async getFirstResultTitle(): Promise<string> {
    await this.page.waitForSelector('a[itemprop="url"].results', { state: 'visible', timeout: 30000 });
    const title = await this.page.locator('a[itemprop="url"].results').first().textContent();
    return title?.trim() ?? '';
  }

  async selectLanguageFilter(language: string): Promise<void> {
    console.log(`🌐 Opening website language selector...`);
    await this.languageSelectorButton.click();

    console.log(`🌐 Selecting "${language}"...`);
    const langLink = this.page.locator(`.language-component.header-dropdown a[title="${language}"]`);
    await langLink.waitFor({ state: 'visible', timeout: 10000 });
    await langLink.click();

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('a[itemprop="url"].results', { state: 'visible', timeout: 30000 });
    console.log(`✅ Language "${language}" selected`);
  }

  async scrollToBottom(): Promise<void> {
    console.log('⬇️  Scrolling to bottom of page...');
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    console.log('✅ Scrolled to bottom');
  }

  async clickNextPage(): Promise<void> {
    console.log('👆 Clicking page 2 button...');
    await this.nextPageButton.click();
    console.log('✅ Page 2 button clicked');
  }

  async goToPage2(): Promise<SearchResultsPage> {
    console.log('📄 Initiating navigation to page 2...');
    await this.scrollToBottom();
    await Promise.all([
      this.page.waitForURL(/verify_human|page=2/, { timeout: 30000 }),
      this.clickNextPage()
    ]);
    console.log('✅ Navigation to page 2 completed');
    return new SearchResultsPage(this.page);
  }

  async handleHumanVerification(): Promise<void> {
    try {
      console.log('🔍 Checking for human verification...');
      // Wait for the verify button to appear (if it exists)
      await this.verifyHumanButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('🤖 Human verification detected - clicking verify button...');
      await this.verifyHumanButton.click();
      await this.page.waitForURL(/page=2|\/search/, { timeout: 15000 });
      console.log('✅ Verification button clicked');
    } catch (error) {
      // Button not found or not needed, continue
      console.log('ℹ️  No human verification required');
    }
  }

  async expectOnPage2(): Promise<void> {
    console.log('🔗 Verifying page 2 URL...');
    const currentUrl = this.page.url();
    if (currentUrl.includes('verify_human')) {
      console.log('⚠️  Bot detection triggered - handling human verification');
      console.log(`🎯 Target URL: ${decodeURIComponent(currentUrl.split('next=')[1])}`);
      await this.handleHumanVerification();
      console.log('⏳ Waiting for redirect to page 2...');
      await this.page.waitForURL(/page=2/, { timeout: 30000 });
    }

    await expect(this.page).toHaveURL(/page=2/);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector('a[itemprop="url"].results', { state: 'visible', timeout: 30000 });
    console.log('✅ Successfully verified page 2 URL!');
    console.log(`📍 Current URL: ${this.page.url()}`);
  }
}