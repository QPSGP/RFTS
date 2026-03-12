#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
  execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}

const message = process.env.DEPLOY_MSG || "chore: deploy";

try {
  const status = execSync("git status --porcelain", { cwd: root, encoding: "utf8" });
  if (status.trim()) {
    run("git add -A");
    run(`git commit -m ${JSON.stringify(message)}`);
    run("git push");
    console.log("\nPushed to GitHub. Vercel will auto-deploy from the linked repo.");
  } else {
    console.log("No changes to commit. Run 'git push' if you need to push existing commits.");
  }
} catch (err) {
  process.exitCode = err.status ?? 1;
}
