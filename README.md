# OpenLibrary Playwright POM Framework

End-to-end test suite for [openlibrary.org](https://openlibrary.org) built with [Playwright](https://playwright.dev) and the Page Object Model pattern.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or higher |
| npm | 8 or higher |

---

## Installation

**1. Clone the repository**

```bash
git clone <repo-url>
cd "Open library"
```

**2. Install Node dependencies**

```bash
npm install
```

**3. Install Playwright browsers**

```bash
npx playwright install chromium
```

---

## Execution

### Run all tests
```bash
npm test
```

### Run in headless mode
```bash
npm run test:headless
```

### Run a specific test file
```bash
npx playwright test src/tests/home.spec.ts
```

### Run with a specific browser
```bash
npx playwright test --project=chromium
```

---

## Reporting

Three reporters are configured and run automatically after every test execution.

### 1. HTML Report (interactive)

Opens automatically in the browser when any test fails.  
To open it manually at any time:

```bash
npx playwright show-report
```

The report includes:
- Pass / fail status per test
- Step-by-step breakdown (via `test.step`)
- Screenshots captured for every test
- Video recordings retained on failure
- Trace viewer links for failed tests

### 2. JSON Report

Generated at `test-results.json` after every run. Useful for parsing results programmatically or feeding into dashboards.

### 3. JUnit XML Report

Generated at `test-results/junit.xml` after every run. Ready for import into CI systems (Jenkins, GitHub Actions, Azure DevOps, etc.).

### View trace for a failed test

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

---

## Project Structure

```
├── playwright.config.ts          # Playwright configuration
├── src/
│   ├── api/
│   │   └── OpenLibraryApi.ts     # Centralised API helper (search endpoint)
│   ├── pages/
│   │   ├── BasePage.ts           # Base page object (goto, title, url)
│   │   ├── HomePage.ts           # Homepage: navigation and search
│   │   └── SearchResultsPage.ts  # Search results: pagination, sort, filters
│   └── tests/
│       └── home.spec.ts          # All 8 test cases
├── test-results/                 # Screenshots, videos, traces, JUnit XML
└── playwright-report/            # HTML report output
```

---

## Test Cases

| # | Title | Type |
|---|-------|------|
| 1 | Open homepage and verify site loads | UI |
| 2 | Search for Biology books | UI |
| 3 | Navigate to page 2 with human verification handling | UI |
| 4 | Verify page 2 URL and human verification completion | UI |
| 5 | Verify page 2 results differ from page 1 results | UI |
| 6 | Validate search API returns correct limit and numFound | API |
| 7 | Sort by First published and validate against API | UI + API |
| 8 | Filter by Spanish language and verify results update | UI |

---

## AI Prompts Used to Build This Framework

The framework and all test files were generated iteratively using an AI assistant (Claude Code). The prompts below are documented in the order they were used, so the full suite can be reproduced or extended from scratch.

---

### 1. Initial test scaffold (Tests 1 – 5)

```
Fix this code. It should:
- Go to URL: https://openlibrary.org/
- Wait for page load
- Enter text in search bar 'Science'
- Search text
- Store book titles in an array (array 1)
- Scroll to bottom of screen
- Click page 2
- Do human verification
- Store titles of page 2 in array 2
- Compare array 1 and array 2 to confirm they do not match
```

---

### 2. Print titles to console

```
Also print page 1 and page 2 titles in the test output.
```

---

### 3. Test 6 – Search API validation

```
For test 6:
Call the search API with limit=12 and q=space parameters.
Validate that the docs array length is exactly 12.
Assert that numFound is a number greater than the limit.
```

---

### 4. Test 7 – Sort by First Published and validate against API

```
For test 7:
Open the 'Relevance' dropdown and click 'First Published' used for sort 'old'.
Capture the title of the first book in the UI.
Call the API with sort=oldest.
Assert that the UI title matches the first title returned in the API docs array.
```

---

### 5. Test 8 – Language filter

```
For test 8:
Use the 'Language' filter on the sidebar to select 'Spanish'.
Assert that the 'Results for...' header updates to reflect the filter
and that at least one result is visible.
Store the header text before and after the language change
and assert they do not match.
```

---

### 6. Extract search term into a shared variable

```
Put the search word in a variable and replace it everywhere it appears
in the test file — function calls, API params, test titles, and log messages.
```

---

### 7. Ensure page fully loads before searching

```
Make sure the page is fully loaded before we search.
Wait for networkidle and for the search input to be visible and enabled
before filling it.
```

---

### 8. Structured test reporting

```
Can we create reporting of all test cases other than just console logs?
Add step-level breakdown in the HTML report, capture screenshots for all tests,
retain video on failure, and add a JUnit XML reporter for CI integration.
```

---

## Test Plan

### Scope

This suite validates the core user journeys on [openlibrary.org](https://openlibrary.org) — search discovery, pagination, result sorting, language switching, and the public search API — using a single Chromium browser in headed mode.

### Coverage

| Area | What is tested |
|------|---------------|
| **Homepage** | Page loads, URL matches, search input is visible |
| **Search** | Query submission, results page URL, page 1 titles collected |
| **Pagination** | Page 2 navigation, bot-detection / human-verification handling, result set differs from page 1 |
| **Sorting** | "First Published" sort via UI dropdown; first result title compared against API `sort=old` response |
| **Language** | Website language switched to Spanish via header dropdown; page heading changes and results remain visible |
| **Search API** | `GET /search.json` with `limit` param returns exactly the requested doc count; `numFound` exceeds the limit |

### Out of Scope

- User authentication, My Books, reading lists
- Book detail pages and work/edition records
- Non-Chromium browsers (Firefox, Safari, mobile)
- Performance and load testing

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Bot detection on pagination | `handleHumanVerification()` detects the `/verify_human` redirect and clicks the verify button automatically |
| Flaky selectors on a third-party site | Role-based locators (`getByRole`, `getByTitle`, `getByLabel`) preferred; `exact: true` used where substring collisions exist |
| Dynamic content timing | No hard sleeps; all waits use `waitForLoadState('networkidle')`, `waitFor({ state: 'visible' })`, or `waitForURL` |
| Test isolation in serial mode | Each test has a self-healing fallback that re-runs earlier setup steps if shared state is missing |
| API response variability | Assertions use `toBeGreaterThan` / `toHaveLength` rather than exact counts so minor catalogue changes do not break tests |

### Tools Used

| Tool | Purpose |
|------|---------|
| [Playwright](https://playwright.dev) v1.44+ | Browser automation, API requests, assertions |
| TypeScript 5 | Type safety across page objects and API helpers |
| Page Object Model | Encapsulates selectors and actions; keeps tests readable |
| Playwright HTML Reporter | Interactive step-level report with screenshots and traces |
| JUnit XML Reporter | CI integration (Jenkins, GitHub Actions, Azure DevOps) |
| JSON Reporter | Machine-readable results for dashboards or custom tooling |

---
