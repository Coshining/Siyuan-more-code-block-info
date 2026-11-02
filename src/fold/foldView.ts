import { FOLD_GUTTER_WIDTH } from "../constants";
import { getBlockId } from "../api";
import { computeFoldRegions } from "./regionParser";
import { splitLinesFromHtml } from "./htmlLines";

interface LineSplit {
    items: string[];
    trailingNewline: boolean;
}

interface OriginalState {
    html: string;
    text: string;
}

/** 每个代码元素（.hljs 最后一个子元素）对应的原始高亮 HTML 与文本 */
const originalMap = new WeakMap<HTMLElement, OriginalState>();
/** 按块 ID 记录的折叠状态（起始行集合），跨重渲染保留 */
const foldedMap = new Map<string, Set<number>>();
/** 被折叠隐藏的行对应的行号标记类 */
const LINE_NUMBER_HIDDEN = "code-fold-number--hidden";
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

/**
 * 代码正文是否正在编辑。
 * 思源编辑时焦点可能落在 wysiwyg 容器上而不在代码元素内，单看 activeElement 会漏判，
 * 因此：焦点在代码内，或“选区仍在代码内且焦点在可编辑区域”都视为编辑中。
 */
function isEditing(codeEl: HTMLElement): boolean {
    const active = document.activeElement;
    if (active && codeEl.contains(active)) {
        return true;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !codeEl.contains(selection.anchorNode)) {
        return false;
    }
    return active instanceof HTMLElement && active.isContentEditable;
}

/** 读取代码元素内的光标偏移（不在代码内时返回 null） */
function getCaretOffset(codeEl: HTMLElement): number | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    const range = selection.getRangeAt(0);
    if (!range.collapsed || !codeEl.contains(range.startContainer)) {
        return null;
    }
    const before = document.createRange();
    before.selectNodeContents(codeEl);
    before.setEnd(range.startContainer, range.startOffset);
    return before.toString().length;
}

/** 把光标放回指定文本偏移处，避免重渲染后光标跳到行首 */
function setCaretOffset(codeEl: HTMLElement, offset: number): void {
    const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
    let remaining = offset;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = node.nodeValue?.length ?? 0;
        if (remaining <= length) {
            const range = document.createRange();
            range.setStart(node, remaining);
            range.collapse(true);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            return;
        }
        remaining -= length;
    }
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

/** 思源行号容器（.hljs 的第一个子元素），未开启行号时返回 null */
function getLineNumberRows(block: HTMLElement): HTMLElement | null {
    const rows = getHljs(block)?.firstElementChild as HTMLElement | null | undefined;
    if (!rows || !rows.classList.contains("protyle-linenumber__rows")) {
        return null;
    }
    return rows;
}

/** 同步行号：隐藏被折叠行对应的行号，避免行号与代码行错位 */
function syncLineNumbers(block: HTMLElement, hiddenLines: Set<number>): void {
    const rows = getLineNumberRows(block);
    if (!rows) {
        return;
    }
    const children = rows.children;
    for (let i = 0; i < children.length; i++) {
        children[i].classList.toggle(LINE_NUMBER_HIDDEN, hiddenLines.has(i));
    }
}

/** 块内折叠视图是否处于激活状态 */
export function isFoldViewActive(block: HTMLElement): boolean {
    const codeEl = getCodeEl(block);
    return !!codeEl && codeEl.classList.contains("code-fold-lines") && hasRenderedLines(codeEl);
}

/** 渲染块内折叠视图（仅在非聚焦且高亮完成后） */
export function renderFoldView(block: HTMLElement): void {
    if (block.getAttribute("data-fold") === "true") {
        return;
    }
    const hljs = getHljs(block);
    if (!hljs || hljs.getAttribute("data-render") !== "true") {
        return;
    }
    const codeEl = getCodeEl(block);
    if (!codeEl || composing || hasRenderedLines(codeEl) || isEditing(codeEl)) {
        return;
    }

    const text = codeEl.textContent ?? "";
    const { items, trailingNewline } = splitLines(text);
    const regions = computeFoldRegions(items);
    if (regions.size === 0) {
        return;
    }
    const folded = foldedMap.get(getBlockId(block)) ?? new Set<number>();

    // 每次都从思源的原始 DOM 重新捕获，避免把折叠视图自身的行元素当成原始内容
    const state: OriginalState = { html: codeEl.innerHTML, text };
    originalMap.set(codeEl, state);
    // 复用思源原始高亮结果按行拆分，避免重新高亮导致样式丢失
    const lineHtmls = splitLinesFromHtml(state.html);

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

    // 重渲染会重建文本节点，先记下光标再恢复，避免输入时被弹到行首
    const caretOffset = getCaretOffset(codeEl);
    codeEl.innerHTML = html;
    codeEl.classList.add("code-fold-lines");
    block.classList.add("code-block--folded");
    syncLineNumbers(block, hiddenLines);
    if (caretOffset !== null) {
        setCaretOffset(codeEl, caretOffset);
    }
}

/** 还原块内折叠视图为原始可编辑高亮 HTML */
export function restoreFoldView(block: HTMLElement): void {
    const codeEl = getCodeEl(block);
    if (codeEl) {
        const state = originalMap.get(codeEl);
        if (hasRenderedLines(codeEl)) {
            // 若当前文本与渲染折叠视图前不一致，说明内容已被外部更新，
            // 此时不写回旧内容，避免覆盖新数据。
            if (state !== undefined && (codeEl.textContent ?? "") === state.text) {
                codeEl.innerHTML = state.html;
            }
            codeEl.classList.remove("code-fold-lines");
        }
        originalMap.delete(codeEl);
    }
    block.classList.remove("code-block--folded");
    syncLineNumbers(block, new Set<number>());
}

/** 还原并重新渲染折叠视图（折叠状态变化、展开整块时调用） */
export function refreshFoldView(block: HTMLElement): void {
    restoreFoldView(block);
    renderFoldView(block);
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
    refreshFoldView(block);
}

/** 把光标按屏幕坐标放回代码正文（还原折叠视图后浏览器会把光标丢到行首） */
function placeCaretAtPoint(block: HTMLElement, x: number, y: number): void {
    const codeEl = getCodeEl(block);
    const selection = window.getSelection();
    // 用户拖选时（选区非折叠）不要干扰
    if (!codeEl || !selection || !selection.isCollapsed) {
        return;
    }
    const range = document.caretRangeFromPoint?.(x, y) ?? null;
    if (!range || !codeEl.contains(range.startContainer)) {
        return;
    }
    selection.removeAllRanges();
    selection.addRange(range);
}

/** 点击位置是否落在折叠箭头（gutter）区域 */
function hitFoldGutter(e: MouseEvent, line: Element): boolean {
    return e.clientX - line.getBoundingClientRect().left < FOLD_GUTTER_WIDTH;
}

/** 为块绑定聚焦还原 / 失焦渲染 / 折叠箭头点击事件 */
export function ensureFoldListeners(block: HTMLElement): void {
    if (!composingBound) {
        composingBound = true;
        window.addEventListener("compositionstart", () => {
            composing = true;
        }, true);
        window.addEventListener("compositionend", () => {
            composing = false;
        }, true);
    }
    if (block.getAttribute("data-fold-bound") === "1") {
        return;
    }
    block.setAttribute("data-fold-bound", "1");

    // 点击代码区域时记录坐标：还原原始 DOM 会破坏浏览器原来的光标定位
    let caretPoint: { x: number; y: number } | null = null;

    block.addEventListener(
        "focusin",
        (e: FocusEvent) => {
            const codeEl = getCodeEl(block);
            if (codeEl && codeEl.contains(e.target as Node)) {
                restoreFoldView(block);
            }
        },
        true,
    );

    block.addEventListener(
        "focusout",
        () => {
            requestAnimationFrame(() => renderFoldView(block));
        },
        true,
    );

    block.addEventListener(
        "mousedown",
        (e: MouseEvent) => {
            caretPoint = null;
            if (!isFoldViewActive(block)) {
                return;
            }
            const line = (e.target as HTMLElement).closest?.(".code-line");
            if (!line) {
                return;
            }
            if (hitFoldGutter(e, line)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            caretPoint = { x: e.clientX, y: e.clientY };
        },
        true,
    );

    block.addEventListener(
        "mouseup",
        () => {
            if (!caretPoint) {
                return;
            }
            const point = caretPoint;
            caretPoint = null;
            placeCaretAtPoint(block, point.x, point.y);
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
