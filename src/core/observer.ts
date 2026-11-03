import type { IProtyle, Plugin } from "siyuan";
import { injectCodeBlockHeader, restoreCodeBlockHeaders } from "./headerInjector";
import { destroyAllThemeSelectors } from "./themeSelector";
import { removeThemeStyles, resetThemeCss } from "./themeCss";
import { uninstallNameIsolation } from "./nameIsolation";
import { uninstallCaretGuard } from "./nameCaret";

const observers = new Map<string, MutationObserver>();
const scheduled = new Set<string>();
/** 插件是否处于启用状态，防止卸载后仍在途的调度重新注入 DOM */
let active = false;

function process(protyle: IProtyle): void {
    if (!active) {
        return;
    }
    const root = protyle.wysiwyg?.element;
    if (!root) {
        return;
    }
    root.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
        injectCodeBlockHeader(block);
    });
}

function schedule(protyle: IProtyle): void {
    if (!active || scheduled.has(protyle.id)) {
        return;
    }
    scheduled.add(protyle.id);
    requestAnimationFrame(() => {
        scheduled.delete(protyle.id);
        if (active) {
            process(protyle);
        }
    });
}

function onLoaded(e: { detail: { protyle: IProtyle } }): void {
    if (!active) {
        return;
    }
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
    const root = protyle.wysiwyg?.element;
    // 编辑器销毁前先还原本编辑器内的代码块，避免菜单等浮层残留在 body 上
    if (root) {
        restoreCodeBlockHeaders(root);
    }
    scheduled.delete(protyle.id);
    observers.get(protyle.id)?.disconnect();
    observers.delete(protyle.id);
}

/** 初始化：监听编辑器加载与销毁事件 */
export function initObserver(plugin: Plugin): void {
    active = true;
    resetThemeCss();
    plugin.eventBus.on("loaded-protyle-static", onLoaded);
    plugin.eventBus.on("loaded-protyle-dynamic", onLoaded);
    plugin.eventBus.on("destroy-protyle", onDestroy);
}

/** 卸载：解绑事件、断开观察者，并还原所有 DOM 变更 */
export function destroyObserver(plugin: Plugin): void {
    active = false;
    plugin.eventBus.off("loaded-protyle-static", onLoaded);
    plugin.eventBus.off("loaded-protyle-dynamic", onLoaded);
    plugin.eventBus.off("destroy-protyle", onDestroy);
    observers.forEach((observer) => observer.disconnect());
    observers.clear();
    scheduled.clear();

    // 1. 移除注入的按钮 / 输入框 / 主题下拉与块状态属性
    restoreCodeBlockHeaders(document);
    // 2. 清理已挂到 body 或所属块已被移除的菜单
    destroyAllThemeSelectors();
    // 3. 移除动态注入的高亮主题样式
    removeThemeStyles();
    // 4. 解绑名称输入框的全局事件隔离与光标保护
    uninstallNameIsolation();
    uninstallCaretGuard();
}
