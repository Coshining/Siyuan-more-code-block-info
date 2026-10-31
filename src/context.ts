import type { PluginConfig, PluginRuntime } from "./types";

let runtime: PluginRuntime | null = null;
let config: PluginConfig = { defaultTheme: "" };

/** 在插件 onload 时注入运行时实例 */
export function initContext(rt: PluginRuntime): void {
    runtime = rt;
}

/** 获取插件运行时（名称、i18n、存储方法） */
export function getRuntime(): PluginRuntime | null {
    return runtime;
}

/** 获取当前配置 */
export function getConfig(): PluginConfig {
    return config;
}

/** 更新配置（内存态，持久化由调用方负责） */
export function setConfig(c: PluginConfig): void {
    config = c;
}

/** 获取当前语言的 i18n 文案 */
export function getI18n(): Record<string, string> {
    return runtime?.i18n ?? {};
}
