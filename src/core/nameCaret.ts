/**
 * 名称输入框光标保护。
 *
 * 思源会在编辑器层处理输入事件，名称输入框内的文字可能被整体选中，
 * 于是继续输入会覆盖已有内容而不是追加。这里在 window 捕获阶段监听
 * 输入框的 select / input / beforeinput / keyup / 组合输入 / focus：
 * - 捕获阶段早于思源的处理，且只修正选中状态，不影响默认的聚焦与输入行为；
 * - 一旦发现“整段被选中”，立即把光标收敛到末尾，并在下一帧再兜底一次
 *   （思源可能在事件处理之后才设置选中状态）。
 */

const NAME_INPUT_CLASS = "code-block-name";

/** 需要同步纠正光标的事件类型 */
const GUARD_EVENTS = ["select", "input", "beforeinput", "keyup", "mouseup", "pointerup"];

/** 聚焦期间的兜底轮询间隔（ms） */
const POLL_INTERVAL = 120;

let installed = false;

/** 正在运行的聚焦轮询定时器，卸载时统一清理 */
const timers = new Set<number>();

/** 正在组合输入（输入法）的输入框，此时不动光标，避免打断候选词 */
const composingInputs = new WeakSet<HTMLInputElement>();

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
    if (composingInputs.has(input) || !isFullySelected(input)) {
        return;
    }
    const end = input.value.length;
    input.setSelectionRange(end, end);
}

/** 立即纠正一次，并在下一帧兜底一次 */
function guardNowAndNextFrame(input: HTMLInputElement): void {
    collapseToEnd(input);
    requestAnimationFrame(() => collapseToEnd(input));
}

/** select / input / beforeinput / keyup / 组合输入 / 鼠标抬起：选中或输入后纠正 */
function onGuardEvent(e: Event): void {
    const input = getNameInput(e.target);
    if (input) {
        guardNowAndNextFrame(input);
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

function onCompositionStart(e: Event): void {
    const input = getNameInput(e.target);
    if (input) {
        composingInputs.add(input);
    }
}

function onCompositionEnd(e: Event): void {
    const input = getNameInput(e.target);
    if (!input) {
        return;
    }
    composingInputs.delete(input);
    guardNowAndNextFrame(input);
}

/**
 * 聚焦后轮询兜底，直到失焦。
 * 思源可能在任何时刻（异步）把输入框文字整段选中，单靠事件无法覆盖。
 */
function startFocusPolling(input: HTMLInputElement): void {
    const timer = window.setInterval(() => {
        if (document.activeElement !== input) {
            window.clearInterval(timer);
            timers.delete(timer);
            return;
        }
        collapseToEnd(input);
    }, POLL_INTERVAL);
    timers.add(timer);
}

/** focus：等默认聚焦行为（点击定位）结束后再判断是否被整体选中 */
function onFocus(e: FocusEvent): void {
    const input = getNameInput(e.target);
    if (!input) {
        return;
    }
    startFocusPolling(input);
    requestAnimationFrame(() => collapseToEnd(input));
}

/** 安装光标保护（全局仅一次） */
export function ensureCaretGuard(): void {
    if (installed) {
        return;
    }
    installed = true;
    for (const type of GUARD_EVENTS) {
        window.addEventListener(type, onGuardEvent, true);
    }
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("focus", onFocus, true);
    window.addEventListener("compositionstart", onCompositionStart, true);
    window.addEventListener("compositionend", onCompositionEnd, true);
}

/** 卸载全局光标保护监听与轮询定时器（插件禁用时调用） */
export function uninstallCaretGuard(): void {
    if (installed) {
        installed = false;
        for (const type of GUARD_EVENTS) {
            window.removeEventListener(type, onGuardEvent, true);
        }
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("focus", onFocus, true);
        window.removeEventListener("compositionstart", onCompositionStart, true);
        window.removeEventListener("compositionend", onCompositionEnd, true);
    }
    timers.forEach((timer) => window.clearInterval(timer));
    timers.clear();
}
