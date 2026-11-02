/**
 * 名称输入框事件隔离。
 *
 * 思源会在文档/编辑器层面处理 mousedown、click、keydown 等事件，代码块收起后
 * 点击名称输入框可能被识别为块选择或被全局快捷键拦截，导致输入框文字被持续选中、
 * 无法编辑。这里在 window 捕获阶段拦截目标为名称输入框的事件（仅 stopPropagation，
 * 不影响浏览器默认的聚焦与光标定位），把输入框与思源的编辑器事件隔离开。
 */

const committedMap = new WeakMap<HTMLInputElement, string>();
let installed = false;

function isNameInput(target: EventTarget | null): target is HTMLInputElement {
    return target instanceof HTMLInputElement && target.classList.contains("code-block-name");
}

function stopIfNameInput(e: Event): void {
    if (isNameInput(e.target)) {
        e.stopPropagation();
    }
}

function onKeyDown(e: KeyboardEvent): void {
    if (!isNameInput(e.target)) {
        return;
    }
    const input = e.target;
    // 阻止冒泡到思源的全局快捷键处理，但不阻止默认输入行为
    e.stopPropagation();
    if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
    } else if (e.key === "Escape") {
        e.preventDefault();
        input.value = committedMap.get(input) ?? input.value;
        input.blur();
    }
}

/** 需要拦在思源之前的指针 / 键盘事件 */
const ISOLATED_EVENTS = [
    "pointerdown",
    "pointerup",
    "mousedown",
    "mouseup",
    "click",
    "selectstart",
    "input",
    "beforeinput",
    "keydown",
    "keyup",
    "keypress",
    "compositionstart",
    "compositionupdate",
    "compositionend",
];

function ensureInstalled(): void {
    if (installed) {
        return;
    }
    installed = true;
    // 捕获阶段拦截，早于思源在 document / 编辑器上的处理
    for (const type of ISOLATED_EVENTS) {
        if (type === "keydown") {
            window.addEventListener(type, onKeyDown, true);
        } else {
            window.addEventListener(type, stopIfNameInput, true);
        }
    }
}

/** 注册名称输入框及其初始提交值 */
export function registerNameInput(input: HTMLInputElement, value: string): void {
    committedMap.set(input, value);
    ensureInstalled();
}

/** 读取输入框上次提交的值 */
export function getCommittedName(input: HTMLInputElement): string {
    return committedMap.get(input) ?? "";
}

/** 更新输入框上次提交的值 */
export function setCommittedName(input: HTMLInputElement, value: string): void {
    committedMap.set(input, value);
}
