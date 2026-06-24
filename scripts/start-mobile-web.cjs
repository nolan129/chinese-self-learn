const fs = require("fs");
const path = require("path");
const { ensureMobileNodeModules } = require("./bootstrap-mobile-node-modules.cjs");

const repoRoot = path.resolve(__dirname, "..");
const projectRoot = path.join(repoRoot, "apps", "mobile");
const expoHomeRoot = path.join(projectRoot, ".expo-home");
const expoUserHome = path.join(expoHomeRoot, "user");
const appDataDir = path.join(expoHomeRoot, "AppData");
const localAppDataDir = path.join(appDataDir, "Local");
const roamingAppDataDir = path.join(appDataDir, "Roaming");
const projectStateDirs = [
  path.join(projectRoot, ".expo"),
  path.join(projectRoot, ".expo", "dev"),
  path.join(projectRoot, ".expo", "dev", "logs"),
  path.join(projectRoot, ".expo", "web")
];

function resolveWorkspaceModule(parts) {
  const candidates = [
    path.join(projectRoot, "node_modules", ...parts),
    path.join(repoRoot, "node_modules", ...parts)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Cannot resolve workspace module path: ${parts.join("/")}`);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureFile(filePath) {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf-8");
  }
}

function prepareEnvironment() {
  [expoHomeRoot, expoUserHome, appDataDir, localAppDataDir, roamingAppDataDir].forEach(ensureDir);
  projectStateDirs.forEach(ensureDir);
  ensureFile(path.join(projectRoot, ".expo", "dev", "logs", "start.log"));

  process.env.__UNSAFE_EXPO_HOME_DIRECTORY = expoUserHome;
  process.env.HOME = expoUserHome;
  process.env.USERPROFILE = expoUserHome;
  process.env.APPDATA = roamingAppDataDir;
  process.env.LOCALAPPDATA = localAppDataDir;
  process.env.EXPO_NO_TELEMETRY = process.env.EXPO_NO_TELEMETRY || "1";
  process.env.EXPO_UNSTABLE_HEADLESS = process.env.EXPO_UNSTABLE_HEADLESS || "1";
  process.env.EXPO_NO_WEB_SETUP = process.env.EXPO_NO_WEB_SETUP || "0";
  process.env.CI = process.env.CI || "1";
  process.env.BROWSER = process.env.BROWSER || "none";
}

function resolveCliArgs() {
  const forwardedArgs = process.argv.slice(2);
  if (forwardedArgs.length > 0) {
    return forwardedArgs;
  }
  return ["start", "--web", "--port", "19006", "--offline"];
}

function main() {
  ensureMobileNodeModules();
  prepareEnvironment();
  process.chdir(projectRoot);

  const cliEntry = resolveWorkspaceModule(["@expo", "cli", "build", "bin", "cli"]);
  const eventsEntry = resolveWorkspaceModule([
    "@expo",
    "cli",
    "build",
    "src",
    "events",
    "index.js"
  ]);
  const eventsModule = require(eventsEntry);
  eventsModule.installEventLogger = () => undefined;
  eventsModule.getWellKnownTemporaryLogFile = () =>
    path.join(expoHomeRoot, "logs", "start.log");

  process.argv = [process.argv[0], cliEntry, ...resolveCliArgs()];
  require(cliEntry);
}

main();
