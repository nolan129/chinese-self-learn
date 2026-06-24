const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const mobileRoot = path.join(repoRoot, "apps", "mobile");
const rootNodeModules = path.join(repoRoot, "node_modules");
const mobileNodeModules = path.join(mobileRoot, "node_modules");
const mobilePackageJson = require(path.join(mobileRoot, "package.json"));

const requiredLinks = Array.from(
  new Set([
    ...Object.keys(mobilePackageJson.dependencies ?? {}),
    ...Object.keys(mobilePackageJson.devDependencies ?? {})
  ])
).map((packageName) => packageName.split("/"));

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveRealPath(targetPath) {
  try {
    return fs.realpathSync.native(targetPath);
  } catch {
    return null;
  }
}

function ensureLink(parts) {
  const targetPath = path.join(rootNodeModules, ...parts);
  const linkPath = path.join(mobileNodeModules, ...parts);

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing root dependency target: ${targetPath}`);
  }

  ensureDir(path.dirname(linkPath));

  if (fs.existsSync(linkPath)) {
    const existingRealPath = resolveRealPath(linkPath);
    const targetRealPath = resolveRealPath(targetPath);
    if (existingRealPath && targetRealPath && existingRealPath === targetRealPath) {
      return;
    }

    const stats = fs.lstatSync(linkPath);
    if (!stats.isSymbolicLink()) {
      throw new Error(
        `Refusing to replace non-link path inside apps/mobile/node_modules: ${linkPath}`
      );
    }

    fs.rmSync(linkPath, { recursive: true, force: true });
  }

  fs.symlinkSync(targetPath, linkPath, "junction");
}

function ensureMobileNodeModules() {
  ensureDir(mobileNodeModules);
  for (const parts of requiredLinks) {
    ensureLink(parts);
  }
}

module.exports = {
  ensureMobileNodeModules,
  repoRoot,
  mobileRoot,
  rootNodeModules,
  mobileNodeModules
};

if (require.main === module) {
  ensureMobileNodeModules();
}
