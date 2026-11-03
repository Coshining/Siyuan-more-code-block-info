/**
 * 折叠视图重渲染时的光标保护。
 *
 * 重建代码正文会销毁原文本节点，浏览器会把光标丢回内容起点；
 * 这里用「文本偏移」保存并在重建后恢复光标，偏移按纯文本计算，
 * 与是否包裹了折叠行元素无关。
 */

/** 读取代码元素内的光标偏移（不在代码内或选区非折叠时返回 null） */
export function getCaretOffset(codeEl: HTMLElement): number | null {
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

/** 把光标放回指定文本偏移处 */
export function setCaretOffset(codeEl: HTMLElement, offset: number): void {
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
