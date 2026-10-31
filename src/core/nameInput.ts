import { ATTR_NAME, NAME_MAX_LENGTH } from "../constants";
import { getI18n } from "../context";
import { getBlockId, removeBlockAttr, setBlockAttr } from "../api";
import { getCommittedName, registerNameInput, setCommittedName } from "./nameIsolation";

/** 创建代码块名称输入框，并绑定持久化 */
export function createNameInput(block: HTMLElement): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "code-block-name";
    input.placeholder = getI18n().namePlaceholder ?? "请输入代码块名称";
    input.maxLength = NAME_MAX_LENGTH;
    input.readOnly = false;
    input.disabled = false;
    input.spellcheck = false;
    input.autocomplete = "off";
    input.value = block.getAttribute(ATTR_NAME) ?? "";

    // 隔离思源编辑器层的指针/键盘事件，避免块收起后输入框被持续选中、无法编辑
    registerNameInput(input, input.value);

    input.addEventListener("focus", () => {
        input.readOnly = false;
        input.disabled = false;
    });

    input.addEventListener("blur", () => {
        const value = input.value.trim();
        const committed = getCommittedName(input);
        if (value === committed) {
            return;
        }
        setCommittedName(input, value);
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
