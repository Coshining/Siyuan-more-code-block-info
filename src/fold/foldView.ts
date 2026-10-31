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

function isFocused(block: HTMLElement, codeEl: HTMLElement): boolean {
    return codeEl.contains(document.activeElement);
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

/** 块内折叠视图是否处于激活状态 */
export function isFoldViewActive(block: HTMLElement): boolean {
    const codeEl = getCodeEl(block);
    return !!codeEl && codeEl.classList.contains("code-fold-lines");
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
    if (!codeEl || codeEl.classList.contains("code-fold-lines") || isFocused(block, codeEl)) {
        return;
    }

    const text = codeEl.textContent ?? "";
    const { items, trailingNewline } = splitLines(text);
    const regions = computeFoldRegions(items);
    if (regions.size === 0) {
        return;
    }
    const folded = foldedMap.get(getBlockId(block)) ?? new Set<number>();

    if (!originalMap.has(codeEl)) {
        originalMap.set(codeEl, { html: codeEl.innerHTML, text });
    }
    const state = originalMap.get(codeEl)!;
    // 复用思源原始高亮结果按行拆分，避免重新高亮导致样式丢失
    const lineHtmls = splitLinesFromHtml(state.html);

    let html = "";
    let hideUntil = -1;
    for (let i = 0; i < items.length; i++) {
        const region = regions.get(i);
        const foldedStart = region !== undefined && folded.has(i);
        // 折叠时保留起始行，仅隐藏其后的行（此判断必须在更新 hideUntil 之前）
        const hidden = i <= hideUntil;
        const classes = ["code-line"];
        if (hidden) {
            classes.push("code-line--hidden");
        }
        if (region) {
            classes.push("code-line--foldable");
        }
        if (foldedStart) {
            classes.push("code-line--folded");
        }
        html += `<div class="${classes.join(" ")}" data-line="${i}">${lineHtmls[i] ?? escapeHtml(items[i])}</div>`;
        if (i < items.length - 1) {
            html += "\n";
        }
        if (foldedStart && region) {
            hideUntil = region.end;
        }
    }
    if (trailingNewline) {
        html += "\n";
    }

    codeEl.innerHTML = html;
    codeEl.classList.add("code-fold-lines");
    block.classList.add("code-block--folded");
}

/** 还原块内折叠视图为原始可编辑高亮 HTML */
export function restoreFoldView(block: HTMLElement): void {
    const codeEl = getCodeEl(block);
    if (codeEl) {
        const state = originalMap.get(codeEl);
        if (state !== undefined) {
            // 若当前文本与渲染折叠视图前不一致，说明内容已被外部更新，
            // 此时不写回旧内容，避免覆盖新数据。
            if (codeEl.textContent === state.text) {
                codeEl.innerHTML = state.html;
            }
            originalMap.delete(codeEl);
        }
        codeEl.classList.remove("code-fold-lines");
    }
    block.classList.remove("code-block--folded");
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

/** 为块绑定聚焦还原 / 失焦渲染 / 折叠箭头点击事件 */
export function ensureFoldListeners(block: HTMLElement): void {
    if (block.getAttribute("data-fold-bound") === "1") {
        return;
    }
    block.setAttribute("data-fold-bound", "1");

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
            if (!isFoldViewActive(block)) {
                return;
            }
            const line = (e.target as HTMLElement).closest?.(".code-line");
            if (!line) {
                return;
            }
            const rect = line.getBoundingClientRect();
            if (e.clientX - rect.left < FOLD_GUTTER_WIDTH) {
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
            if (!line) {
                return;
            }
            const rect = line.getBoundingClientRect();
            if (e.clientX - rect.left < FOLD_GUTTER_WIDTH) {
                e.preventDefault();
                e.stopPropagation();
                const index = Number(line.getAttribute("data-line"));
                if (Number.isInteger(index)) {
                    toggleFold(block, index);
                }
            }
        },
        true,
    );
}
