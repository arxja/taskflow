#!/usr/bin/env bun

const targets = [
  {
    name: "macOS ARM64",
    target: "bun-darwin-arm64",
    out: "dist/taskflow-macos-arm64",
  },
  {
    name: "macOS x64",
    target: "bun-darwin-x64",
    out: "dist/taskflow-macos-x64",
  },
  {
    name: "Linux x64",
    target: "bun-linux-x64",
    out: "dist/taskflow-linux-x64",
  },
  {
    name: "Linux ARM64",
    target: "bun-linux-arm64",
    out: "dist/taskflow-linux-arm64",
  },
  { name: "Windows x64", target: "bun-windows-x64", out: "dist/taskflow.exe" },
];

console.log("🔨 Building TaskFlow CLI for all platforms...\n");

for (const { name, target, out } of targets) {
  console.log(`📦 Building for ${name}...`);
  const result = Bun.spawnSync([
    "bun",
    "build",
    "./src/cli/index.ts",
    "--compile",
    "--outfile",
    out,
    "--target",
    target,
    "--minify",
  ]);

  if (result.exitCode === 0) {
    console.log(`✅ ${out}\n`);
  } else {
    console.error(`❌ Failed for ${name}`);
    console.error(result.stderr.toString());
  }
}

console.log("🎉 All builds complete!");
