import "./index.scss";

import { Plugin } from "siyuan";
import type { PluginRuntime } from "./types";
import { initContext, setConfig } from "./context";
import { destroyObserver, initObserver } from "./core/observer";
import { initSettings } from "./settings";
import { logger } from "./util/logger";

const STORAGE = "config.json";

export default class MoreCodeBlockInfoPlugin extends Plugin {
    async onload(): Promise<void> {
        // 将插件实例注入运行时上下文（类型桥接，结构一致）
        initContext(this as unknown as PluginRuntime);

        try {
            const data = await this.loadData(STORAGE);
            const theme = (data as { defaultTheme?: unknown } | null)?.defaultTheme;
            if (typeof theme === "string") {
                setConfig({ defaultTheme: theme });
            }
        } catch (error) {
            logger.warn("读取配置失败，使用默认值", error);
        }

        initSettings(this);
        initObserver(this);
        logger.info("插件已加载");
    }

    onunload(): void {
        destroyObserver(this);
        logger.info("插件已卸载");
    }
}
