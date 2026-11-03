/**
 * 折叠区域编辑保护。
 *
 * 被折叠的行是 `display: none`，但仍留在 DOM 里。把光标放到折叠区后一行并在行首退格时，
 * 浏览器会向前跨过隐藏行去合并文本，结果把折叠内容删掉。
 * 这里在折叠边界上拦截 Backspace / Delete，避免编辑穿透到不可见的行。
 */

/** 光标所在的行元素（选区需落在代码内且为行内 `.code-line`） */
function caretLine(codeEl: HTMLElement): HTMLElement | null {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
        return null;
    }
    const anchor = selection.anchorNode;
    if (!anchor || !codeEl.contains(anchor)) {
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

/** 安装折叠边界拦截（每个块一次） */
export function installEditGuard(block: HTMLElement, getCodeEl: () => HTMLElement | null): void {
    block.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
            if (e.key !== "Backspace" && e.key !== "Delete") {
                return;
            }
            const codeEl = getCodeEl();
            if (!codeEl) {
                return;
            }
            const line = caretLine(codeEl);
            if (!line) {
                return;
            }
            const offset = offsetIn(line);
            if (offset < 0) {
                return;
            }
            const blocked =
                e.key === "Backspace"
                    ? offset === 0 && isHiddenLine(line.previousElementSibling)
                    : offset === lineLength(line) && isHiddenLine(line.nextElementSibling);
            if (blocked) {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        true,
    );
}
