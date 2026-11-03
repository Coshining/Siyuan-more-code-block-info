import { MARKER } from "../constants";
import { applyThemeToBlock, createThemeSelector } from "./themeSelector";
import { createNameInput } from "./nameInput";
import { applyCollapseState, createCollapseButton } from "./collapse";

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
    lang?.classList.remove("protyle-action--first");

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
