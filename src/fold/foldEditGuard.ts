/**
 * 折叠区域编辑保护。
 *
 * 被折叠的行是 `display: none`，但仍留在 DOM 里。把光标放到折叠区后一行并在行首退格时，
 * 浏览器会向前跨过隐藏行去合并文本，结果把折叠内容删掉。
 * 思源会先于代码块处理按键，因此这里在 window 捕获阶段拦截 Backspace / Delete：
 * 第一次先展开对应的折叠区，再按一次才真正执行合并。
 */

/** 光标所在的行元素（选区需落在折叠行元素内） */
function caretLine(): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return null;
    }
    const anchor = selection.anchorNode;
    if (!anchor) {
        return null;
    }
    const element = anchor.nodeType === Node.ELEMENT_NODE ? (anchor as HTMLElement) : anchor.parentElement;
    return element?.closest<HTMLElement>(".code-line") ?? null;
}

/** 光标在该行内的文本偏移，无法计算时返回 -1 */
function offsetIn(line: HTMLElement): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return -1;
    }
    const range = selection.getRangeAt(0);
    if (!line.contains(range.startContainer)) {
        return -1;
    }
    const before = document.createRange();
    before.selectNodeContents(line);
    before.setEnd(range.startContainer, range.startOffset);
    return before.toString().length;
}

/** 行元素自身的文本长度（不含行尾换行） */
function lineLength(line: HTMLElement): number {
    const text = line.textContent ?? "";
    return text.endsWith("\n") ? text.length - 1 : text.length;
}

function isHiddenLine(node: Element | null | undefined): boolean {
    return !!node && node.classList.contains("code-line--hidden");
}

/** 从隐藏行向前找到所属折叠区间的起始行号 */
function findFoldStart(hiddenLine: Element): number | null {
    let node: Element | null = hiddenLine.previousElementSibling;
    while (node) {
        if (node.classList.contains("code-line--folded")) {
            const index = Number((node as HTMLElement).getAttribute("data-line"));
            return Number.isInteger(index) ? index : null;
        }
        if (node.classList.contains("code-line") && !node.classList.contains("code-line--hidden")) {
            return null;
        }
        node = node.previousElementSibling;
    }
    return null;
}

let installed = false;

/** 安装折叠边界拦截（全局仅一次） */
export function ensureEditGuard(unfoldAt: (block: HTMLElement, startLine: number) => void): void {
    if (installed) {
        return;
    }
    installed = true;
    window.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (e.key !== "Backspace" && e.key !== "Delete") {
                return;
            }
            const line = caretLine();
            if (!line) {
                return;
            }
            const offset = offsetIn(line);
            if (offset < 0) {
                return;
            }
            const neighbor =
                e.key === "Backspace"
                    ? (offset === 0 ? line.previousElementSibling : null)
                    : (offset === lineLength(line) ? line.nextElementSibling : null);
            if (!isHiddenLine(neighbor)) {
                return;
            }
            const block = line.closest<HTMLElement>(".code-block");
            const startLine = findFoldStart(neighbor as Element);
            if (block && startLine !== null) {
                // 下一帧再展开，避免在按键事件处理中重建 DOM
                window.setTimeout(() => unfoldAt(block, startLine), 0);
            }
            e.preventDefault();
            e.stopPropagation();
        },
        true,
    );
}
