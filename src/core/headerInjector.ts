import { MARKER } from "../constants";
import { applyThemeToBlock, createThemeSelector } from "./themeSelector";
import { createNameInput } from "./nameInput";
import { applyCollapseState, createCollapseButton } from "./collapse";
import { ensureFoldListeners, renderFoldView } from "../fold/foldView";

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
    const spacer = action.querySelector<HTMLElement>(".fn__flex-1");
    // 语言移动到右侧后不再位于首位，移除「first」样式避免圆角/间距异常
    lang?.classList.remove("protyle-action--first");

    applyCollapseState(block);
    applyThemeToBlock(block);

    const collapseBtn = createCollapseButton(block);
    const nameInput = createNameInput(block);
    const themeSelector = createThemeSelector(block);

    if (spacer) {
        spacer.before(collapseBtn, nameInput);
        if (lang) {
            spacer.after(lang);
            lang.after(themeSelector);
        } else {
            spacer.after(themeSelector);
        }
    } else {
        action.prepend(collapseBtn, nameInput);
        if (lang) {
            action.appendChild(lang);
        }
        action.appendChild(themeSelector);
    }

    block.setAttribute(MARKER, "1");
    ensureFoldListeners(block);
    renderFoldView(block);
}
