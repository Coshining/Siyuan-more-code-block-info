import { HLJS_STYLE_BASE, HLJS_VERSION } from "../constants";
import { logger } from "../util/logger";

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

function styleId(name: string): string {
    return `code-theme-css-${name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/** 检测浏览器是否支持 CSS 原生嵌套 */
function supportsNesting(): boolean {
    try {
        const style = document.createElement("style");
        style.textContent = ".a { .b { color: red; } }";
        document.head.appendChild(style);
        const rule = style.sheet?.cssRules[0] as unknown as
            | { cssRules?: CSSRuleList }
            | undefined;
        const ok = !!rule?.cssRules && rule.cssRules.length > 0;
        style.remove();
        return ok;
    } catch {
        return false;
    }
}

/** 检测浏览器是否支持 CSS @scope */
function supportsScope(): boolean {
    try {
        const style = document.createElement("style");
        style.textContent = "@scope (.x) { .y { color: red; } }";
        document.head.appendChild(style);
        const ok = !!style.sheet && style.sheet.cssRules.length > 0;
        style.remove();
        return ok;
    } catch {
        return false;
    }
}

/**
 * 将主题 CSS 作用域限定到指定代码块。
 * 优先使用原生嵌套（会继承选择器特异性，可稳定覆盖思源原生主题），
 * 其次 @scope，最后回退为全局注入。
 */
function scopeCss(name: string, css: string): string {
    const selector = `.code-block[data-code-theme="${name}"]`;
    if (supportsNesting()) {
        return `${selector} {\n${css}\n}`;
    }
    if (supportsScope()) {
        return `@scope (${selector}) {\n${css}\n}`;
    }
    return css;
}

async function loadTheme(name: string): Promise<void> {
    try {
        const url = `${HLJS_STYLE_BASE}${name}.min.css?v=${HLJS_VERSION}`;
        const resp = await fetch(url);
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const css = await resp.text();
        injectThemeStyle(name, css);
        loaded.add(name);
    } catch (error) {
        logger.error("加载高亮主题失败", name, error);
    } finally {
        pending.delete(name);
    }
}

function injectThemeStyle(name: string, css: string): void {
    const id = styleId(name);
    if (document.getElementById(id)) {
        return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.setAttribute("data-code-theme", name);
    style.textContent = scopeCss(name, css);
    document.head.appendChild(style);
}

/** 确保指定主题的作用域 CSS 已加载（幂等，异步加载） */
export function ensureThemeCss(name: string): void {
    if (!name || loaded.has(name) || pending.has(name)) {
        return;
    }
    pending.set(name, loadTheme(name));
}
