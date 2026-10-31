import { Setting } from "siyuan";
import type { Plugin } from "siyuan";
import { FOLLOW_SIYUAN, THEME_OPTIONS } from "./constants";
import { getConfig, getI18n, getRuntime, setConfig } from "./context";
import { refreshAllThemes } from "./core/themeSelector";
import { logger } from "./util/logger";

const STORAGE = "config.json";

/** 初始化插件设置面板（全局默认代码高亮主题） */
export function initSettings(plugin: Plugin): void {
    const i18n = getI18n();
    const select = document.createElement("select");
    select.className = "b3-select";

    const followOption = document.createElement("option");
    followOption.value = FOLLOW_SIYUAN;
    followOption.textContent = i18n.themeFollowSiyuan ?? "跟随思源";
    select.appendChild(followOption);

    for (const option of THEME_OPTIONS) {
        const item = document.createElement("option");
        item.value = option.name;
        item.textContent = option.label;
        select.appendChild(item);
    }
    select.value = getConfig().defaultTheme;

    const apply = (): void => {
        setConfig({ defaultTheme: select.value });
        refreshAllThemes();
        void getRuntime()
            ?.saveData(STORAGE, getConfig())
            .catch((error) => logger.error("保存配置失败", error));
    };

    select.addEventListener("change", apply);

    plugin.setting = new Setting({
        confirmCallback: apply,
    });
    plugin.setting.addItem({
        title: i18n.defaultThemeTitle ?? "默认代码高亮主题",
        description: i18n.defaultThemeDesc ?? "",
        direction: "column",
        createActionElement: () => select,
    });
}
