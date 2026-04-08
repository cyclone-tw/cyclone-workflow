#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";

const versionFile = "src/lib/version.ts";
const versionTxtFile = ".version.txt";

const content = readFileSync(versionFile, "utf-8");
const match = content.match(/VERSION\s*=\s*['"]v(\d+)\.(\d+)['"]/);

if (!match) {
  console.error("Could not parse version");
  process.exit(1);
}

const [, year, monthDay, patch] = match;
const now = new Date();
const yearStr = now.getFullYear().toString();
const month = (now.getMonth() + 1).toString().padStart(2, "0");
const day = now.getDate().toString().padStart(2, "0");
const hour = now.getHours().toString().padStart(2, "0");
const minute = now.getMinutes().toString().padStart(2, "0");

const newVersion = `v${yearStr}${month}${day}.${hour}${minute}`;

const newContent = content.replace(
  /VERSION\s*=\s*['"]v[^'"]+['"]/,
  `VERSION = '${newVersion}'`
);

writeFileSync(versionFile, newContent);
writeFileSync(versionTxtFile, newVersion);

console.log(`Bumped to ${newVersion}`);
