import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
    const isDev = mode === "development";
    return {
        resolve: {
            alias: {
                "@": resolve(import.meta.dirname, "src"),
            },
        },
        build: {
            outDir: isDev ? "dev" : "dist",
            emptyOutDir: true,
            minify: !isDev,
            sourcemap: isDev ? "inline" : false,
            lib: {
                entry: resolve(import.meta.dirname, "src/index.ts"),
                fileName: () => "index.js",
                formats: ["cjs"],
            },
            rollupOptions: {
                external: ["siyuan"],
                output: {
                    entryFileNames: "[name].js",
                    // 思源插件要求样式文件名为 index.css
                    assetFileNames: (assetInfo) =>
                        assetInfo.name?.endsWith(".css") ? "index.css" : (assetInfo.name ?? "asset"),
                },
            },
        },
    };
});
