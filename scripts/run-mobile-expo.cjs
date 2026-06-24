const path = require("path");
const { spawn } = require("child_process");
const { ensureMobileNodeModules, mobileRoot, repoRoot } = require("./bootstrap-mobile-node-modules.cjs");

function main() {
  ensureMobileNodeModules();

  const expoCli = path.join(repoRoot, "node_modules", "expo", "bin", "cli");
  const args = process.argv.slice(2);
  const child = spawn(process.execPath, [expoCli, ...args], {
    cwd: mobileRoot,
    env: process.env,
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
