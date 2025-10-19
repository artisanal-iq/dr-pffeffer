import { cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const pnpmDir = join(projectRoot, "node_modules", ".pnpm");

if (!existsSync(pnpmDir)) {
  process.exit(0);
}

const entries = readdirSync(pnpmDir);
const lightningPackage = entries.find((entry) => entry.startsWith("lightningcss@"));
if (!lightningPackage) {
  process.exit(0);
}

const lightningDir = join(pnpmDir, lightningPackage, "node_modules", "lightningcss");
if (!existsSync(lightningDir)) {
  process.exit(0);
}

for (const entry of entries) {
  if (!entry.startsWith("lightningcss-") || entry.includes("@vitest")) {
    continue;
  }

  const pkgName = entry.split("@")[0];
  const pkgDir = join(pnpmDir, entry, "node_modules", pkgName);
  if (!existsSync(pkgDir)) {
    continue;
  }

  const binaryName = `lightningcss.${pkgName.replace("lightningcss-", "")}.node`;
  const source = join(pkgDir, binaryName);
  if (!existsSync(source)) {
    continue;
  }

  const target = join(lightningDir, binaryName);
  if (existsSync(target)) {
    continue;
  }

  try {
    cpSync(source, target, { force: false });
  } catch (error) {
    // Ignore copy failures (file may already exist or be read-only)
  }
}
