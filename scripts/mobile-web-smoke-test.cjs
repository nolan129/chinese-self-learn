const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseUrl = process.env.HAN_NOTE_MOBILE_WEB_URL || "http://127.0.0.1:19006";
const screenshotDir =
  process.env.HAN_NOTE_QA_DIR ||
  path.resolve(__dirname, "..", "docs", "qa", "mobile-web-smoke");
const edgePath =
  process.env.HAN_NOTE_EDGE_PATH ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function screenshot(page, name) {
  const target = path.join(screenshotDir, name);
  await page.screenshot({ path: target, fullPage: true });
  return target;
}

async function clickText(page, text, options = {}) {
  const locator = page.getByText(text, { exact: options.exact ?? true }).first();
  await locator.waitFor({ state: "visible", timeout: options.timeout ?? 30000 });
  await locator.click();
}

async function clickButton(page, name, options = {}) {
  const timeout = options.timeout ?? 30000;
  const exact = options.exact ?? true;
  const roleLocator = page.getByRole("button", { name, exact }).first();
  try {
    await roleLocator.waitFor({ state: "visible", timeout: 3000 });
    await roleLocator.click();
    return;
  } catch {
    const textLocator = page.getByText(name, { exact }).last();
    await textLocator.waitFor({ state: "visible", timeout });
    await textLocator.locator("xpath=..").click();
  }
}

async function clickTokenStatus(page, tokenText, statusLabel) {
  await clickText(page, tokenText);
  await clickButton(page, statusLabel);
}

async function waitForAppReady(page) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.getByText("Đọc chat tiếng Trung nhanh hơn", { exact: true }).waitFor({
    state: "visible",
    timeout: 90000
  });
}

async function waitForAnyVisible(locators, timeout = 60000) {
  return Promise.any(
    locators.map(async ({ key, locator }) => {
      await locator.waitFor({ state: "visible", timeout });
      return key;
    })
  );
}

async function run() {
  await ensureDir(screenshotDir);

  const browser = await chromium.launch({
    headless: true,
    executablePath: edgePath
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }
  });
  const page = await context.newPage();

  const report = {
    baseUrl,
    screenshots: {},
    steps: []
  };

  try {
    await waitForAppReady(page);
    report.steps.push("loaded_home");
    report.title = await page.title();
    report.screenshots.home = await screenshot(page, "01-home.png");

    await clickButton(page, "Phân tích");
    await page.getByText("Bạn có thấy anh ấy không?", { exact: true }).waitFor({
      state: "visible",
      timeout: 60000
    });
    report.steps.push("analyze_success");
    report.screenshots.analyze = await screenshot(page, "02-analyze-result.png");

    await clickTokenStatus(page, "看见", "Chưa biết");
    await clickTokenStatus(page, "吗", "Muốn ôn lại");
    await clickButton(page, "Giải nghĩa 2 từ", { exact: false });
    await page.getByText("Sẵn sàng lưu 2 từ", { exact: true }).waitFor({
      state: "visible",
      timeout: 60000
    });
    report.steps.push("explain_success");
    report.screenshots.explain = await screenshot(page, "03-explain.png");

    await clickButton(page, "Lưu và ôn ngay");
    const reviewState = await waitForAnyVisible([
      {
        key: "review_ready",
        locator: page.getByText("Xem đáp án", { exact: true })
      },
      {
        key: "review_empty",
        locator: page.getByText("Không có từ đến hạn", { exact: true })
      }
    ]);
    report.steps.push("review_screen_loaded");
    report.screenshots.review = await screenshot(page, "04-review.png");

    if (reviewState === "review_ready") {
      await clickButton(page, "Xem đáp án");
      await clickButton(page, "Nhớ");
      report.steps.push("review_submit_success");
    } else {
      report.steps.push("review_empty_state");
    }

    await clickText(page, "Từ vựng");
    await page.getByText("Vocabulary", { exact: true }).waitFor({
      state: "visible",
      timeout: 30000
    });
    report.steps.push("vocabulary_loaded");
    report.screenshots.vocabulary = await screenshot(page, "05-vocabulary.png");

    await clickText(page, "Cài đặt");
    await page.getByText("Settings", { exact: true }).waitFor({
      state: "visible",
      timeout: 30000
    });
    report.steps.push("settings_loaded");
    report.screenshots.settings = await screenshot(page, "06-settings.png");

    report.status = "ok";
  } finally {
    const reportPath = path.join(screenshotDir, "report.json");
    await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf-8");
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
