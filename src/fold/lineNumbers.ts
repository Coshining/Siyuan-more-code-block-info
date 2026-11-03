/**
 * 与思源行号容器同步。
 *
 * 思源行号由 `.hljs` 的第一个子元素（`protyle-linenumber__rows`）渲染，
 * 折叠隐藏的代码行如果只隐藏正文，行号就会与代码错位，这里同步隐藏对应行号。
 */

const LINE_NUMBER_HIDDEN = "code-fold-number--hidden";

/** 思源行号容器，未开启行号时返回 null */
function getLineNumberRows(hljs: HTMLElement | null): HTMLElement | null {
    const rows = hljs?.firstElementChild as HTMLElement | null | undefined;
    if (!rows || !rows.classList.contains("protyle-linenumber__rows")) {
        return null;
    }
    return rows;
}

/** 隐藏 / 还原与被折叠行对应的行号 */
export function syncLineNumbers(hljs: HTMLElement | null, hiddenLines: Set<number>): void {
    const rows = getLineNumberRows(hljs);
    if (!rows) {
        return;
    }
    const children = rows.children;
    for (let i = 0; i < children.length; i++) {
        children[i].classList.toggle(LINE_NUMBER_HIDDEN, hiddenLines.has(i));
    }
}
