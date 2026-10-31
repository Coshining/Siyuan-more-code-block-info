/**
 * 名称输入框光标保护。
 *
 * 思源会在编辑器层处理输入事件，名称输入框内的文字可能被整体选中，
 * 于是继续输入会覆盖已有内容而不是追加。这里在 window 捕获阶段监听
 * 输入框的 select / input / keydown / focus：
 * - 捕获阶段早于思源的处理，且只修正选中状态，不影响默认的聚焦与输入行为；
 * - 一旦发现“整段被选中”，立即把光标收敛到末尾。
 */

const NAME_INPUT_CLASS = "code-block-name";

let installed = false;

function getNameInput(target: EventTarget | null): HTMLInputElement | null {
    if (!(target instanceof HTMLInputElement)) {
        return null;
    }
    return target.classList.contains(NAME_INPUT_CLASS) ? target : null;
}

/** 输入框内容是否被整体选中 */
function isFullySelected(input: HTMLInputElement): boolean {
    const length = input.value.length;
    return length > 0 && input.selectionStart === 0 && input.selectionEnd === length;
}

/** 把“整段选中”收敛为末尾光标 */
function collapseToEnd(input: HTMLInputElement): void {
    if (!isFullySelected(input)) {
        return;
    }
    const end = input.value.length;
    input.setSelectionRange(end, end);
}

/** select / input：选中或输入完成后立刻纠正 */
function onSelectOrInput(e: Event): void {
    const input = getNameInput(e.target);
    if (input) {
        collapseToEnd(input);
    }
}

/** keydown：在插入字符前纠正，避免整段文字被覆盖 */
function onKeyDown(e: KeyboardEvent): void {
    const input = getNameInput(e.target);
    if (!input) {
        return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        collapseToEnd(input);
    }
}

/** focus：等默认聚焦行为（点击定位）结束后再判断是否被整体选中 */
function onFocus(e: FocusEvent): void {
    const input = getNameInput(e.target);
    if (!input) {
        return;
    }
    requestAnimationFrame(() => collapseToEnd(input));
}

/** 安装光标保护（全局仅一次） */
export function ensureCaretGuard(): void {
    if (installed) {
        return;
    }
    installed = true;
    window.addEventListener("select", onSelectOrInput, true);
    window.addEventListener("input", onSelectOrInput, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("focus", onFocus, true);
}
