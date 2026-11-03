/**
 * 代码行的文本 / HTML 辅助函数。
 *
 * 折叠视图按行包裹行内 `.code-line` 元素，换行符保留在元素内部；
 * 这里负责把文本拆行、转义，以及从已渲染的行元素里回收每行的高亮 HTML。
 */

import { splitLinesFromHtml } from "./htmlLines";

export interface LineSplit {
    items: string[];
    trailingNewline: boolean;
}

/** 按换行拆分文本，并单独标记末尾换行 */
export function splitLines(text: string): LineSplit {
    const items = text.split("\n");
    let trailingNewline = false;
    if (items.length > 0 && items[items.length - 1] === "") {
        trailingNewline = true;
        items.pop();
    }
    return { items, trailingNewline };
}

/** 转义为 HTML 文本 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** 取出单个代码行元素的高亮 HTML（去掉行尾换行与折叠提示符） */
function lineHtmlOf(line: HTMLElement): string {
    const clone = line.cloneNode(true) as HTMLElement;
    clone.querySelector(".code-fold-marker")?.remove();
    const last = clone.lastChild;
    if (last && last.nodeType === Node.TEXT_NODE && (last.nodeValue ?? "").endsWith("\n")) {
        last.nodeValue = (last.nodeValue ?? "").slice(0, -1);
    }
    return clone.innerHTML;
}

/** 已渲染状态下，从行元素里取回每行的高亮 HTML（并清理编辑产生的嵌套结构） */
export function collectRenderedLineHtmls(codeEl: HTMLElement, trailingNewline: boolean): string[] {
    const raw = Array.from(codeEl.children)
        .map((child) => lineHtmlOf(child as HTMLElement))
        .join("\n") + (trailingNewline ? "\n" : "");
    const temp = document.createElement("div");
    temp.innerHTML = raw;
    // 编辑过程中浏览器 / 思源可能在行元素里再套行元素，先拆掉再按行重新拆分
    temp.querySelectorAll(".code-line").forEach((el) => el.replaceWith(...Array.from(el.childNodes)));
    temp.querySelectorAll(".code-fold-marker").forEach((el) => el.remove());
    return splitLinesFromHtml(temp.innerHTML);
}
