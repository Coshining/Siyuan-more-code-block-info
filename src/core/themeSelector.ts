import { ATTR_THEME, FOLLOW_SIYUAN, THEME_OPTIONS } from "../constants";
import { getConfig, getI18n } from "../context";
import { getBlockId, removeBlockAttr, setBlockAttr } from "../api";
import { ensureThemeCss } from "./themeCss";

/** 计算块最终生效的主题：块属性 → 全局默认 → 空（跟随思源） */
function resolveTheme(blockTheme: string | null): string {
    if (blockTheme !== null && blockTheme !== "") {
        return blockTheme;
    }
    return getConfig().defaultTheme ?? FOLLOW_SIYUAN;
}

/** 主题展示名称 */
function themeLabel(name: string): string {
    const found = THEME_OPTIONS.find((item) => item.name === name);
    return found ? found.label : name;
}

/** 为单个块应用生效主题（设置 data-code-theme 与加载 CSS） */
export function applyThemeToBlock(block: HTMLElement): void {
    const effective = resolveTheme(block.getAttribute(ATTR_THEME));
    if (!effective) {
        block.removeAttribute("data-code-theme");
        return;
    }
    ensureThemeCss(effective);
    block.setAttribute("data-code-theme", effective);
}

/** 刷新所有代码块的主题（全局默认主题变化时调用） */
export function refreshAllThemes(): void {
    document.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
        applyThemeToBlock(block);
    });
}

/** 阻止事件冒泡 */
function stop(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
}

/** 创建代码块高亮主题下拉 */
export function createThemeSelector(block: HTMLElement): HTMLElement {
    const i18n = getI18n();
    const wrap = document.createElement("div");
    wrap.className = "code-block-theme";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "code-block-theme__trigger";
    trigger.innerHTML = `<span class="code-block-theme__label"></span><svg><use xlink:href="#iconDown"></use></svg>`;
    const label = trigger.querySelector<HTMLElement>(".code-block-theme__label")!;

    const menu = document.createElement("div");
    menu.className = "code-block-theme__menu fn__none";

    // 第一项：清除块级覆盖，跟随默认
    const followItem = document.createElement("div");
    followItem.className = "code-block-theme__item";
    followItem.textContent = i18n.themeFollowDefault ?? "跟随默认";
    followItem.dataset.value = FOLLOW_SIYUAN;
    menu.appendChild(followItem);

    for (const option of THEME_OPTIONS) {
        const item = document.createElement("div");
        item.className = "code-block-theme__item";
        item.textContent = option.label;
        item.dataset.value = option.name;
        menu.appendChild(item);
    }

    const updateLabel = (): void => {
        const effective = resolveTheme(block.getAttribute(ATTR_THEME));
        label.textContent = effective ? themeLabel(effective) : (i18n.themeFollowSiyuan ?? "跟随思源");
    };

    const updateCurrent = (): void => {
        const override = block.getAttribute(ATTR_THEME);
        menu.querySelectorAll<HTMLElement>(".code-block-theme__item").forEach((item) => {
            const isCurrent =
                (override === null && item.dataset.value === FOLLOW_SIYUAN) ||
                item.dataset.value === override;
            item.classList.toggle("code-block-theme__item--current", isCurrent);
        });
    };

    const close = (): void => {
        menu.classList.add("fn__none");
        document.removeEventListener("pointerdown", onDocPointerDown, true);
        // 关闭时移回原容器，便于下次打开
        if (menu.parentElement !== wrap) {
            wrap.appendChild(menu);
        }
    };

    // 菜单挂到 body 上并用 fixed 定位，避免被后续代码块（层叠上下文）覆盖
    const positionMenu = (): void => {
        const rect = trigger.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const placeAbove = spaceBelow < 160;
        menu.style.position = "fixed";
        menu.style.right = "auto";
        menu.style.minWidth = `${rect.width}px`;
        menu.style.zIndex = "100000";
        if (placeAbove) {
            menu.style.top = "auto";
            menu.style.bottom = `${window.innerHeight - rect.top + 2}px`;
            menu.style.maxHeight = `${Math.max(120, Math.min(320, rect.top - 8))}px`;
        } else {
            menu.style.bottom = "auto";
            menu.style.top = `${rect.bottom + 2}px`;
            menu.style.maxHeight = `${Math.max(120, Math.min(320, spaceBelow))}px`;
        }
        menu.style.left = `${rect.left}px`;
        const width = menu.offsetWidth;
        const maxLeft = Math.max(8, window.innerWidth - width - 8);
        if (rect.left > maxLeft) {
            menu.style.left = `${maxLeft}px`;
        }
    };

    const open = (): void => {
        updateCurrent();
        menu.classList.remove("fn__none");
        document.body.appendChild(menu);
        positionMenu();
        document.addEventListener("pointerdown", onDocPointerDown, true);
    };

    const onDocPointerDown = (e: Event): void => {
        const target = e.target as Node;
        if (!wrap.contains(target) && !menu.contains(target)) {
            close();
        }
    };

    const select = (value: string): void => {
        const id = getBlockId(block);
        if (value === FOLLOW_SIYUAN) {
            block.removeAttribute(ATTR_THEME);
            removeBlockAttr(id, ATTR_THEME);
        } else {
            block.setAttribute(ATTR_THEME, value);
            setBlockAttr(id, ATTR_THEME, value);
        }
        applyThemeToBlock(block);
        updateLabel();
        close();
    };

    trigger.addEventListener("pointerdown", stop);
    trigger.addEventListener("mousedown", stop);
    trigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (menu.classList.contains("fn__none")) {
            open();
        } else {
            close();
        }
    });

    menu.addEventListener("pointerdown", stop);
    menu.addEventListener("mousedown", stop);
    menu.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const item = (e.target as HTMLElement).closest<HTMLElement>(".code-block-theme__item");
        if (item) {
            select(item.dataset.value ?? FOLLOW_SIYUAN);
        }
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    updateLabel();
    return wrap;
}
