import { MARKER } from "../constants";
import { applyThemeToBlock, createThemeSelector, destroyThemeSelector } from "./themeSelector";
import { createNameInput } from "./nameInput";
import { applyCollapseState, createCollapseButton } from "./collapse";

/** 记录语言标签被插件移除的原始 class 状态，卸载时还原 */
const langHadFirstClass = new WeakMap<HTMLElement, boolean>();

/**
 * 对代码块标题栏注入自定义头部并重排：
 * 左 [整块收起, 名称] | 占位 | 右 [语言, 主题] | 复制 | 更多
 */
export function injectCodeBlockHeader(block: HTMLElement): void {
    if (block.hasAttribute(MARKER)) {
        return;
    }
    const action = block.querySelector<HTMLElement>(":scope > .protyle-action");
    if (!action) {
        block.setAttribute(MARKER, "1");
        return;
    }

    const lang = action.querySelector<HTMLElement>(".protyle-action__language");
    // 思源 highlightRender 依赖 .protyle-action 的第一个子元素的 textContent 读取语言，
    // 因此必须让语言 span 保持在 DOM 首位，仅通过 CSS order 调整视觉顺序。
    if (lang) {
        langHadFirstClass.set(lang, lang.classList.contains("protyle-action--first"));
        lang.classList.remove("protyle-action--first");
    }

    applyCollapseState(block);
    applyThemeToBlock(block);

    const collapseBtn = createCollapseButton(block);
    const nameInput = createNameInput(block);
    const themeSelector = createThemeSelector(block);

    // 追加到末尾，视觉顺序由 SCSS 的 order 控制
    action.appendChild(collapseBtn);
    action.appendChild(nameInput);
    action.appendChild(themeSelector);

    block.setAttribute(MARKER, "1");
}

/**
 * 还原单个代码块的 DOM：移除注入元素与插件状态属性，
 * 并把语言标签的 class 恢复为注入前的状态。
 */
export function restoreCodeBlockHeader(block: HTMLElement): void {
    if (!block.hasAttribute(MARKER)) {
        return;
    }

    destroyThemeSelector(block);

    const action = block.querySelector<HTMLElement>(":scope > .protyle-action");
    action
        ?.querySelectorAll<HTMLElement>(
            ":scope > .code-block-collapse, :scope > .code-block-name, :scope > .code-block-theme",
        )
        .forEach((element) => element.remove());

    const lang = action?.querySelector<HTMLElement>(".protyle-action__language");
    if (lang) {
        if (langHadFirstClass.get(lang)) {
            lang.classList.add("protyle-action--first");
        }
        langHadFirstClass.delete(lang);
    }

    block.removeAttribute(MARKER);
    block.removeAttribute("data-fold");
    block.removeAttribute("data-code-theme");
}

/** 还原指定范围内所有由插件处理过的代码块 */
export function restoreCodeBlockHeaders(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>(`.code-block[${MARKER}]`).forEach(restoreCodeBlockHeader);
}
