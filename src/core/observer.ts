import type { IProtyle, Plugin } from "siyuan";
import { injectCodeBlockHeader } from "./headerInjector";
import { renderFoldView } from "../fold/foldView";

/** 交互结束后延迟重渲染，等待思源异步重新高亮完成 */
const SETTLE_DELAY = 260;

const protyles = new Map<string, IProtyle>();
const observers = new Map<string, MutationObserver>();
const scheduled = new Set<string>();
let settleTimers: number[] = [];

function process(protyle: IProtyle): void {
    const root = protyle.wysiwyg?.element;
    if (!root) {
        return;
    }
    root.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
        injectCodeBlockHeader(block);
        renderFoldView(block);
    });
}

function schedule(protyle: IProtyle): void {
    if (scheduled.has(protyle.id)) {
        return;
    }
    scheduled.add(protyle.id);
    requestAnimationFrame(() => {
        scheduled.delete(protyle.id);
        process(protyle);
    });
}

/**
 * 交互结束后统一重渲染一次。
 * 思源在编辑结束时会异步重置并重新高亮代码块（移除后又写回 data-render 与正文），
 * 触发时机不固定，单靠一次 MutationObserver 回调容易错过，
 * 这里在所有交互结束后再延迟兜底渲染，保证折叠视图不会丢失。
 */
function scheduleSettle(): void {
    settleTimers.forEach((timer) => window.clearTimeout(timer));
    const renderAll = (): void => protyles.forEach((protyle) => process(protyle));
    settleTimers = [
        window.setTimeout(renderAll, SETTLE_DELAY),
        // 思源重新高亮可能更晚完成，再兜底一次
        window.setTimeout(renderAll, SETTLE_DELAY * 3),
    ];
}

function onLoaded(e: { detail: { protyle: IProtyle } }): void {
    const protyle = e.detail.protyle;
    protyles.set(protyle.id, protyle);
    process(protyle);
    const root = protyle.wysiwyg?.element;
    if (!root || observers.has(protyle.id)) {
        return;
    }
    const observer = new MutationObserver(() => schedule(protyle));
    observer.observe(root, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-render"],
    });
    observers.set(protyle.id, observer);
}

function onDestroy(e: { detail: { protyle: IProtyle } }): void {
    const protyle = e.detail.protyle;
    observers.get(protyle.id)?.disconnect();
    observers.delete(protyle.id);
    protyles.delete(protyle.id);
}

/** 初始化：监听编辑器加载与销毁事件 */
export function initObserver(plugin: Plugin): void {
    plugin.eventBus.on("loaded-protyle-static", onLoaded);
    plugin.eventBus.on("loaded-protyle-dynamic", onLoaded);
    plugin.eventBus.on("destroy-protyle", onDestroy);
    window.addEventListener("focusout", scheduleSettle, true);
    window.addEventListener("mouseup", scheduleSettle, true);
    window.addEventListener("keyup", scheduleSettle, true);
}

/** 卸载：解绑事件并断开所有观察者 */
export function destroyObserver(plugin: Plugin): void {
    plugin.eventBus.off("loaded-protyle-static", onLoaded);
    plugin.eventBus.off("loaded-protyle-dynamic", onLoaded);
    plugin.eventBus.off("destroy-protyle", onDestroy);
    window.removeEventListener("focusout", scheduleSettle, true);
    window.removeEventListener("mouseup", scheduleSettle, true);
    window.removeEventListener("keyup", scheduleSettle, true);
    settleTimers.forEach((timer) => window.clearTimeout(timer));
    settleTimers = [];
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
    protyles.clear();
}
