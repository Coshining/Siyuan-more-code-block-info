// 清理构建产物（跨平台 Node 脚本）
import { rmSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const name of ["dist", "dev", "package.zip"]) {
    const p = resolve(root, name);
    if (existsSync(p)) {
        rmSync(p, { recursive: true, force: true });
        console.log(`removed ${name}`);
    }
}
console.log("cleaned");
