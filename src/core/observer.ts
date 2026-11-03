import type { IProtyle, Plugin } from "siyuan";
import { injectCodeBlockHeader } from "./headerInjector";

const observers = new Map<string, MutationObserver>();
const scheduled = new Set<string>();

function process(protyle: IProtyle): void {
    const root = protyle.wysiwyg?.element;
    if (!root) {
        return;
    }
    root.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
        injectCodeBlockHeader(block);
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

function onLoaded(e: { detail: { protyle: IProtyle } }): void {
    const protyle = e.detail.protyle;
    process(protyle);
    const root = protyle.wysiwyg?.element;
    if (!root || observers.has(protyle.id)) {
        return;
    }
    const observer = new MutationObserver(() => schedule(protyle));
    observer.observe(root, {
        childList: true,
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
}

/** 初始化：监听编辑器加载与销毁事件 */
export function initObserver(plugin: Plugin): void {
    plugin.eventBus.on("loaded-protyle-static", onLoaded);
    plugin.eventBus.on("loaded-protyle-dynamic", onLoaded);
    plugin.eventBus.on("destroy-protyle", onDestroy);
}

/** 卸载：解绑事件并断开所有观察者 */
export function destroyObserver(plugin: Plugin): void {
    plugin.eventBus.off("loaded-protyle-static", onLoaded);
    plugin.eventBus.off("loaded-protyle-dynamic", onLoaded);
    plugin.eventBus.off("destroy-protyle", onDestroy);
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
}
