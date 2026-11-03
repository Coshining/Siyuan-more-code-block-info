import { FOLD_GUTTER_WIDTH } from "../constants";
import type { FoldRegion } from "../types";
import { getBlockId } from "../api";
import { computeFoldRegions } from "./regionParser";
import { splitLinesFromHtml } from "./htmlLines";
import { getCaretOffset, setCaretOffset } from "./foldCaret";
import { syncLineNumbers } from "./lineNumbers";

interface LineSplit {
    items: string[];
    trailingNewline: boolean;
}

/** 按块 ID 记录的折叠状态（起始行集合），跨重渲染保留 */
const foldedMap = new Map<string, Set<number>>();
/** 代码元素当前渲染对应的结构签名，结构未变就不重建 DOM */
const renderedMap = new WeakMap<HTMLElement, string>();
/** 行结构变化后同步折叠视图的延迟（ms） */
const SYNC_DELAY = 180;
/** 是否有输入法组合输入进行中（此时任何 DOM 重写都会打断候选词） */
let composing = false;
let composingBound = false;

function getHljs(block: HTMLElement): HTMLElement | null {
    return block.querySelector<HTMLElement>(":scope > .hljs");
}

function getCodeEl(block: HTMLElement): HTMLElement | null {
    const hljs = getHljs(block);
    if (!hljs) {
        return null;
    }
    return (hljs.lastElementChild as HTMLElement | null) ?? null;
}

function splitLines(text: string): LineSplit {
    const items = text.split("\n");
    let trailingNewline = false;
    if (items.length > 0 && items[items.length - 1] === "") {
        trailingNewline = true;
        items.pop();
    }
    return { items, trailingNewline };
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** 代码元素内是否已经渲染过折叠行 */
function hasRenderedLines(codeEl: HTMLElement): boolean {
    return codeEl.querySelector(":scope > .code-line") !== null;
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

/** 已渲染状态下，从行元素里取回每行的高亮 HTML */
function collectRenderedLineHtmls(codeEl: HTMLElement): string[] {
    return Array.from(codeEl.children).map((child) => lineHtmlOf(child as HTMLElement));
}

/** 结构签名：行数 + 可折叠区间 + 折叠状态；结构未变就不重建 DOM */
function buildSignature(lineCount: number, regions: Map<number, FoldRegion>, folded: Set<number>): string {
    const parts: string[] = [String(lineCount)];
    regions.forEach((region, start) => {
        parts.push(`${start}-${region.end}${folded.has(start) ? "*" : ""}`);
    });
    return parts.join("|");
}

/** 块内折叠视图是否处于激活状态 */
export function isFoldViewActive(block: HTMLElement): boolean {
    const codeEl = getCodeEl(block);
    return !!codeEl && codeEl.classList.contains("code-fold-lines") && hasRenderedLines(codeEl);
}

/**
 * 渲染 / 实时更新块内折叠视图。
 * 编辑过程中也会更新：结构签名（行数 + 折叠区间 + 折叠状态）未变时不重建 DOM，
 * 需要重建时先记下光标、重建后再恢复，避免打断正在进行的输入。
 */
export function renderFoldView(block: HTMLElement, force = false): void {
    if (block.getAttribute("data-fold") === "true") {
        return;
    }
    const hljs = getHljs(block);
    if (!hljs || hljs.getAttribute("data-render") !== "true") {
        return;
    }
    const codeEl = getCodeEl(block);
    if (!codeEl || composing) {
        return;
    }

    const text = codeEl.textContent ?? "";
    const { items, trailingNewline } = splitLines(text);
    const regions = computeFoldRegions(items);
    const folded = foldedMap.get(getBlockId(block)) ?? new Set<number>();
    const rendered = hasRenderedLines(codeEl);

    // 已经没有可折叠区间：把行元素还原成普通高亮 HTML
    if (regions.size === 0) {
        if (rendered) {
            unfoldLines(block, codeEl, trailingNewline);
        }
        return;
    }

    const signature = buildSignature(items.length, regions, folded);
    if (!force && rendered && renderedMap.get(codeEl) === signature) {
        return;
    }

    // 已渲染时从行元素里取每行高亮 HTML，否则从思源原始高亮 HTML 拆行
    const lineHtmls = rendered ? collectRenderedLineHtmls(codeEl) : splitLinesFromHtml(codeEl.innerHTML);
    const caretOffset = getCaretOffset(codeEl);

    let html = "";
    let hideUntil = -1;
    const hiddenLines = new Set<number>();
    for (let i = 0; i < items.length; i++) {
        const region = regions.get(i);
        const foldedStart = region !== undefined && folded.has(i);
        // 折叠时保留起始行，仅隐藏其后的行（此判断必须在更新 hideUntil 之前）
        const hidden = i <= hideUntil;
        const classes = ["code-line"];
        if (hidden) {
            classes.push("code-line--hidden");
            hiddenLines.add(i);
        }
        if (region) {
            classes.push("code-line--foldable");
        }
        if (foldedStart) {
            classes.push("code-line--folded");
        }
        // 行元素用行内 span，并让换行符留在元素内部：
        // 1. 思源会给正文设置 white-space: pre-wrap，行间的换行文本节点会额外产生空行；
        // 2. 行被隐藏时换行符一并隐藏，不会留下空行；
        // 3. textContent 与原文完全一致，行号计算与聚焦还原都不受影响。
        const newline = i < items.length - 1 || trailingNewline ? "\n" : "";
        // 折叠提示符必须落在换行符之前，否则会跑到下一行
        const marker = foldedStart ? `<span class="code-fold-marker"></span>` : "";
        html += `<span class="${classes.join(" ")}" data-line="${i}">${lineHtmls[i] ?? escapeHtml(items[i])}${marker}${newline}</span>`;
        if (foldedStart && region) {
            hideUntil = region.end;
        }
    }

    // 重渲染会重建文本节点，重建前已记下光标偏移，这里恢复回去
    codeEl.innerHTML = html;
    codeEl.classList.add("code-fold-lines");
    block.classList.add("code-block--folded");
    renderedMap.set(codeEl, signature);
    syncLineNumbers(hljs, hiddenLines);
    if (caretOffset !== null) {
        setCaretOffset(codeEl, caretOffset);
    }
}

/** 取消行元素包装，还原为普通高亮 HTML */
function unfoldLines(block: HTMLElement, codeEl: HTMLElement, trailingNewline: boolean): void {
    const caretOffset = getCaretOffset(codeEl);
    codeEl.innerHTML = collectRenderedLineHtmls(codeEl).join("\n") + (trailingNewline ? "\n" : "");
    codeEl.classList.remove("code-fold-lines");
    renderedMap.delete(codeEl);
    block.classList.remove("code-block--folded");
    syncLineNumbers(getHljs(block), new Set<number>());
    if (caretOffset !== null) {
        setCaretOffset(codeEl, caretOffset);
    }
}

/** 强制重渲染（整块收起 / 展开时调用） */
export function refreshFoldView(block: HTMLElement): void {
    renderFoldView(block, true);
}

/** 切换某起始行的折叠状态 */
export function toggleFold(block: HTMLElement, startLine: number): void {
    const id = getBlockId(block);
    const set = foldedMap.get(id) ?? new Set<number>();
    if (set.has(startLine)) {
        set.delete(startLine);
    } else {
        set.add(startLine);
    }
    foldedMap.set(id, set);
    renderFoldView(block, true);
}

/** 点击位置是否落在折叠箭头（gutter）区域 */
function hitFoldGutter(e: MouseEvent, line: Element): boolean {
    return e.clientX - line.getBoundingClientRect().left < FOLD_GUTTER_WIDTH;
}

/** 为块绑定实时同步与折叠箭头点击事件 */
export function ensureFoldListeners(block: HTMLElement): void {
    bindCompositionTracking();
    if (block.getAttribute("data-fold-bound") === "1") {
        return;
    }
    block.setAttribute("data-fold-bound", "1");

    let syncTimer = 0;
    const scheduleSync = (): void => {
        window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(() => renderFoldView(block), SYNC_DELAY);
    };

    // 编辑时行结构（换行、缩进）变化后实时刷新折叠按钮
    const syncIfInCode = (e: Event): void => {
        const codeEl = getCodeEl(block);
        if (codeEl && e.target instanceof Node && codeEl.contains(e.target)) {
            scheduleSync();
        }
    };
    block.addEventListener("input", syncIfInCode, true);
    block.addEventListener("keyup", syncIfInCode, true);
    block.addEventListener("focusout", scheduleSync, true);

    block.addEventListener(
        "mousedown",
        (e: MouseEvent) => {
            if (!isFoldViewActive(block)) {
                return;
            }
            const line = (e.target as HTMLElement).closest?.(".code-line");
            if (line && hitFoldGutter(e, line)) {
                // 不把光标放进代码，避免点箭头时触发编辑
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true,
    );

    block.addEventListener(
        "click",
        (e: MouseEvent) => {
            if (!isFoldViewActive(block)) {
                return;
            }
            const line = (e.target as HTMLElement).closest?.(".code-line");
            if (!line || !hitFoldGutter(e, line)) {
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            const index = Number(line.getAttribute("data-line"));
            if (Number.isInteger(index)) {
                toggleFold(block, index);
            }
        },
        true,
    );
}

/** 绑定输入法组合状态跟踪（全局仅一次） */
function bindCompositionTracking(): void {
    if (composingBound) {
        return;
    }
    composingBound = true;
    window.addEventListener(
        "compositionstart",
        () => {
            composing = true;
        },
        true,
    );
    window.addEventListener(
        "compositionend",
        () => {
            composing = false;
        },
        true,
    );
}


