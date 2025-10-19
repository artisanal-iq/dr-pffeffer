import { existsSync } from "node:fs";
import { mkdir, rm, symlink } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist-test");
const source = join(dist, "src");
const aliasDir = join(dist, "@");

async function main() {
  if (!existsSync(dist) || !existsSync(source)) {
    return;
  }
  if (existsSync(aliasDir)) {
    await rm(aliasDir, { recursive: true, force: true });
  }
  await mkdir(dist, { recursive: true });
  await symlink(source, aliasDir, "dir");
}

main().catch((error) => {
  console.error("Failed to prepare test module aliases", error);
  process.exitCode = 1;
});
