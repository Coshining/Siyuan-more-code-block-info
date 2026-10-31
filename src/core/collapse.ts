import { ATTR_FOLD } from "../constants";
import { getI18n } from "../context";
import { getBlockId, setBlockAttr } from "../api";
import { refreshFoldView } from "../fold/foldView";

/** 阻止事件冒泡 */
function stop(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
}

/** 根据块属性设置整块收起状态 */
export function applyCollapseState(block: HTMLElement): void {
    const folded = block.getAttribute(ATTR_FOLD) === "true";
    block.setAttribute("data-fold", folded ? "true" : "false");
}

/** 创建整块收起按钮 */
export function createCollapseButton(block: HTMLElement): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-block-collapse";
    const i18n = getI18n();

    const render = (): void => {
        const folded = block.getAttribute("data-fold") === "true";
        btn.innerHTML = folded
            ? `<svg><use xlink:href="#iconRight"></use></svg>`
            : `<svg><use xlink:href="#iconDown"></use></svg>`;
        btn.title = folded
            ? (i18n.unfoldCode ?? "展开代码块")
            : (i18n.foldCode ?? "收起代码块");
    };
    render();

    btn.addEventListener("pointerdown", stop);
    btn.addEventListener("mousedown", stop);
    btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const folded = block.getAttribute("data-fold") === "true";
        const next = folded ? "false" : "true";
        block.setAttribute("data-fold", next);
        block.setAttribute(ATTR_FOLD, next);
        setBlockAttr(getBlockId(block), ATTR_FOLD, next);
        render();
        refreshFoldView(block);
    });

    return btn;
}
