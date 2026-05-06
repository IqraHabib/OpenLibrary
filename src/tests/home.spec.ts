import { chromium, expect, test } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import HomePage from '../pages/HomePage';
import SearchResultsPage from '../pages/SearchResultsPage';
import { OpenLibraryApi } from '../api/OpenLibraryApi';

test.describe.configure({ mode: 'serial' });

const SEARCH_QUERY = 'Biology';

test.describe('OpenLibrary Automation Suite', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let homePage: HomePage;
  let searchResultsPage: SearchResultsPage | undefined;
  let page2Results: SearchResultsPage | undefined;
  let firstPageTitles: string[] | undefined;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext();
    page = await context.newPage();
    homePage = new HomePage(page);
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('1. Open homepage and verify site loads', async () => {
    await test.step('Navigate to OpenLibrary homepage', async () => {
      await homePage.open();
    });

    await test.step('Verify homepage is loaded and search bar is visible', async () => {
      await homePage.expectOpenLibraryHome();
    });
  });

  test(`2. Search for ${SEARCH_QUERY} books`, async () => {
    await test.step('Navigate to homepage', async () => {
      await homePage.open();
    });

    await test.step(`Enter "${SEARCH_QUERY}" in search bar and submit`, async () => {
      searchResultsPage = await homePage.search(SEARCH_QUERY);
    });

    await test.step('Verify search results page is visible', async () => {
      await searchResultsPage!.expectSearchResultsVisible();
    });

    await test.step('Collect and store page 1 book titles', async () => {
      firstPageTitles = await searchResultsPage!.getAllResultTitles();
      console.log(`Collected ${firstPageTitles.length} titles from page 1`);
    });
  });

  test('3. Navigate to page 2 with human verification handling', async () => {
    await test.step('Ensure search results are available', async () => {
      if (!searchResultsPage) {
        await homePage.open();
        searchResultsPage = await homePage.search(SEARCH_QUERY);
        await searchResultsPage.expectSearchResultsVisible();
        firstPageTitles = await searchResultsPage.getAllResultTitles();
      } else if (!firstPageTitles) {
        firstPageTitles = await searchResultsPage.getAllResultTitles();
      }
    });

    await test.step('Scroll to bottom and click page 2 button', async () => {
      page2Results = await searchResultsPage!.goToPage2();
    });
  });

  test('4. Verify page 2 URL and human verification completion', async () => {
    await test.step('Ensure page 2 navigation was triggered', async () => {
      if (!page2Results) {
        if (!searchResultsPage) {
          await homePage.open();
          searchResultsPage = await homePage.search(SEARCH_QUERY);
          await searchResultsPage.expectSearchResultsVisible();
          firstPageTitles = await searchResultsPage.getAllResultTitles();
        }
        page2Results = await searchResultsPage!.goToPage2();
      }
    });

    await test.step('Handle human verification and confirm page 2 URL', async () => {
      await page2Results!.expectOnPage2();
    });
  });

  test('5. Verify page 2 results differ from page 1 results', async () => {
    if (!firstPageTitles || !page2Results) {
      throw new Error('Test 5 requires page 1 and page 2 results from prior tests in the same browser session');
    }

    let secondPageTitles: string[] = [];

    await test.step('Collect page 2 book titles', async () => {
      secondPageTitles = await page2Results!.getAllResultTitles();
    });

    await test.step('Print page 1 titles', async () => {
      console.log(`\nPage 1 titles (${firstPageTitles!.length}):`);
      firstPageTitles!.forEach((title, i) => console.log(`  ${i + 1}. ${title}`));
    });

    await test.step('Print page 2 titles', async () => {
      console.log(`\nPage 2 titles (${secondPageTitles.length}):`);
      secondPageTitles.forEach((title, i) => console.log(`  ${i + 1}. ${title}`));
    });

    await test.step('Assert page 1 and page 2 titles do not match', async () => {
      const sameTitleCount = firstPageTitles!.filter(t => secondPageTitles.includes(t)).length;
      console.log(`\nMatching titles count: ${sameTitleCount}`);
      expect(secondPageTitles).not.toEqual(firstPageTitles);
    });
  });

  test('6. Validate search API returns correct limit and numFound', async ({ request }) => {
    const api = new OpenLibraryApi(request);
    const limit = 12;
    let data: Awaited<ReturnType<typeof api.searchBooks>>;

    await test.step(`Call search API with q=space and limit=${limit}`, async () => {
      data = await api.searchBooks({ q: 'space', limit });
    });

    await test.step(`Assert docs array length is exactly ${limit}`, async () => {
      console.log(`docs array length: ${data!.docs.length}`);
      expect(data!.docs).toHaveLength(limit);
    });

    await test.step('Assert numFound is a number greater than the limit', async () => {
      console.log(`numFound: ${data!.numFound}`);
      expect(typeof data!.numFound).toBe('number');
      expect(data!.numFound).toBeGreaterThan(limit);
    });
  });

  test('7. Sort by First published and validate against API', async ({ request }) => {
    if (!searchResultsPage) {
      throw new Error('Test 7 requires an active search results page from prior tests');
    }

    const api = new OpenLibraryApi(request);
    let firstUiTitle = '';
    let firstApiTitle = '';

    await test.step('Sort results by First published', async () => {
      await searchResultsPage!.sortByFirstPublished();
    });

    await test.step('Capture first book title from UI', async () => {
      firstUiTitle = await searchResultsPage!.getFirstResultTitle();
      console.log(`First UI title: "${firstUiTitle}"`);
    });

    await test.step(`Call API with q=${SEARCH_QUERY}&sort=old`, async () => {
      const data = await api.searchBooks({ q: SEARCH_QUERY, sort: 'old' });
      firstApiTitle = (data.docs[0]?.title ?? '').trim();
      console.log(`First API title: "${firstApiTitle}"`);
    });

    await test.step('Assert UI first title matches API first title', async () => {
      expect(firstUiTitle).toBe(firstApiTitle);
    });
  });

  test('8. Filter by Spanish language and verify results update', async () => {
    if (!searchResultsPage) {
      throw new Error('Test 8 requires an active search results page from prior tests');
    }

    let headingBefore = '';
    let headingAfter = '';

    await test.step('Capture page heading before language change', async () => {
      headingBefore = (await searchResultsPage!.pageHeading.textContent()) ?? '';
      console.log(`Heading before: "${headingBefore.trim()}"`);
    });

    await test.step('Open language selector and select Spanish', async () => {
      await searchResultsPage!.selectLanguageFilter('Spanish');
    });

    await test.step('Capture page heading after language change', async () => {
      headingAfter = (await searchResultsPage!.pageHeading.textContent()) ?? '';
      console.log(`Heading after: "${headingAfter.trim()}"`);
    });

    await test.step('Assert heading changed to reflect Spanish language', async () => {
      await expect(searchResultsPage!.pageHeading).toBeVisible();
      expect(headingAfter.trim()).not.toBe(headingBefore.trim());
    });

    await test.step('Assert at least one result is visible', async () => {
      const resultCount = await searchResultsPage!.resultItems.count();
      console.log(`Visible results: ${resultCount}`);
      expect(resultCount).toBeGreaterThan(0);
    });
  });
});
