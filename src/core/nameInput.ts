import { ATTR_NAME, NAME_MAX_LENGTH } from "../constants";
import { getI18n } from "../context";
import { getBlockId, removeBlockAttr, setBlockAttr } from "../api";

/** 仅阻止冒泡（不能 preventDefault，否则输入框无法聚焦） */
function stopPropagation(e: Event): void {
    e.stopPropagation();
}

/** 创建代码块名称输入框，并绑定持久化 */
export function createNameInput(block: HTMLElement): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "code-block-name";
    input.placeholder = getI18n().namePlaceholder ?? "请输入代码块名称";
    input.maxLength = NAME_MAX_LENGTH;
    input.value = block.getAttribute(ATTR_NAME) ?? "";
    let committed = input.value;

    input.addEventListener("pointerdown", stopPropagation);
    input.addEventListener("mousedown", stopPropagation);
    input.addEventListener("click", stopPropagation);
    input.addEventListener("dblclick", stopPropagation);

    input.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            input.blur();
        } else if (e.key === "Escape") {
            input.value = committed;
            input.blur();
        }
    });

    input.addEventListener("blur", () => {
        const value = input.value.trim();
        if (value === committed) {
            return;
        }
        committed = value;
        const id = getBlockId(block);
        if (value) {
            block.setAttribute(ATTR_NAME, value);
            setBlockAttr(id, ATTR_NAME, value);
        } else {
            block.removeAttribute(ATTR_NAME);
            removeBlockAttr(id, ATTR_NAME);
        }
    });

    return input;
}
