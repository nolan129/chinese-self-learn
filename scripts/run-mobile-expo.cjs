const path = require("path");
const { spawn } = require("child_process");
const { ensureMobileNodeModules, mobileRoot, repoRoot } = require("./bootstrap-mobile-node-modules.cjs");

function ensureDir(dirPath) {
  require("fs").mkdirSync(dirPath, { recursive: true });
}

function buildExpoEnv() {
  const expoHomeRoot = path.join(mobileRoot, ".expo-home");
  const expoUserHome = path.join(expoHomeRoot, "user");
  const appDataDir = path.join(expoHomeRoot, "AppData");
  const localAppDataDir = path.join(appDataDir, "Local");
  const roamingAppDataDir = path.join(appDataDir, "Roaming");

  [expoHomeRoot, expoUserHome, appDataDir, localAppDataDir, roamingAppDataDir].forEach(ensureDir);

  return {
    ...process.env,
    __UNSAFE_EXPO_HOME_DIRECTORY: expoUserHome,
    HOME: expoUserHome,
    USERPROFILE: expoUserHome,
    APPDATA: roamingAppDataDir,
    LOCALAPPDATA: localAppDataDir,
    EXPO_NO_TELEMETRY: process.env.EXPO_NO_TELEMETRY || "1",
    EXPO_UNSTABLE_HEADLESS: process.env.EXPO_UNSTABLE_HEADLESS || "1",
    BROWSER: process.env.BROWSER || "none",
    CI: process.env.CI || "1"
  };
}

function main() {
  ensureMobileNodeModules();

  const expoCli = path.join(repoRoot, "node_modules", "expo", "bin", "cli");
  const args = process.argv.slice(2);
  const child = spawn(process.execPath, [expoCli, ...args], {
    cwd: mobileRoot,
    env: buildExpoEnv(),
    stdio: "inherit"
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}

main();
