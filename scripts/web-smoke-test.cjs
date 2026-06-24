const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const baseUrl = process.env.HAN_NOTE_WEB_URL || "http://127.0.0.1:3001";
const screenshotDir =
  process.env.HAN_NOTE_QA_DIR ||
  path.resolve(__dirname, "..", "docs", "qa", "web-smoke");
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

async function readDueCount(page) {
  const duePill = page.locator(".due-pill strong");
  if ((await duePill.count()) === 0) return null;
  const text = (await duePill.first().innerText()).trim();
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function clickTokenStatus(page, tokenText, statusLabel) {
  await page.locator(".token", { hasText: tokenText }).first().click();
  await page.getByRole("button", { name: statusLabel, exact: true }).click();
}

async function clickNav(page, label) {
  await page.locator("nav[aria-label='Primary navigation']").getByRole("button", {
    name: label,
    exact: true
  }).click();
}

async function run() {
  await ensureDir(screenshotDir);

  const browser = await chromium.launch({
    headless: true,
    executablePath: edgePath
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  const report = {
    baseUrl,
    screenshots: {},
    steps: []
  };

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForLoadState("domcontentloaded");
    report.steps.push("loaded_home");
    report.title = await page.title();
    report.initialDueCount = await readDueCount(page);
    report.screenshots.home = await screenshot(page, "01-home.png");

    await page.locator("main").getByRole("button", { name: "Phân tích", exact: true }).click();
    await page.locator(".sentence-card").waitFor({ state: "visible", timeout: 15000 });
    report.steps.push("analyze_success");
    report.screenshots.analyze = await screenshot(page, "02-analyze-result.png");

    await clickTokenStatus(page, "看见", "Chưa biết");
    await clickTokenStatus(page, "吗", "Muốn ôn lại");
    await page.getByRole("button", { name: /Giải nghĩa 2 từ/ }).click();
    await page.getByRole("heading", { name: "Giải nghĩa", exact: true }).waitFor({
      state: "visible",
      timeout: 15000
    });
    report.steps.push("explain_success");
    report.screenshots.explain = await screenshot(page, "03-explain.png");

    await page.getByRole("button", { name: "Lưu và ôn ngay", exact: true }).click();
    await page
      .getByRole("button", { name: "Xem đáp án", exact: true })
      .waitFor({ state: "visible", timeout: 15000 });
    report.steps.push("review_session_started");
    report.screenshots.review = await screenshot(page, "04-review.png");

    await page.getByRole("button", { name: "Xem đáp án", exact: true }).click();
    await page.getByRole("button", { name: "Nhớ", exact: true }).click();
    await page.waitForTimeout(1000);
    report.steps.push("review_submit_success");

    await clickNav(page, "Từ vựng");
    await page.getByRole("heading", { name: "Vocabulary", exact: true }).waitFor({
      state: "visible",
      timeout: 15000
    });
    await page.locator(".word-item").first().waitFor({ state: "visible", timeout: 15000 });
    report.steps.push("vocabulary_loaded");
    report.screenshots.vocabulary = await screenshot(page, "05-vocabulary.png");

    await clickNav(page, "Cài đặt");
    await page.getByRole("heading", { name: "Settings", exact: true }).waitFor({
      state: "visible",
      timeout: 15000
    });
    report.steps.push("settings_loaded");

    const privacyCheckbox = page
      .getByLabel("Không lưu câu nguồn từ nội dung đã dán")
      .first();
    const originalChecked = await privacyCheckbox.isChecked();
    await privacyCheckbox.click();
    await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
    await page.getByText("Đã lưu cài đặt.", { exact: true }).waitFor({
      state: "visible",
      timeout: 15000
    });
    await privacyCheckbox.click();
    await page.getByRole("button", { name: "Lưu cài đặt", exact: true }).click();
    await page.getByText("Đã lưu cài đặt.", { exact: true }).waitFor({
      state: "visible",
      timeout: 15000
    });
    report.steps.push("settings_save_roundtrip");
    report.restoredPrivacyCheckbox = originalChecked;
    report.screenshots.settings = await screenshot(page, "06-settings.png");

    report.finalDueCount = await readDueCount(page);
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
