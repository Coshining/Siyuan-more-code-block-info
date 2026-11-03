/** 主题选项 */
export interface ThemeOption {
    /** highlight.js 主题名（CDN 路径中的名称） */
    name: string;
    /** 展示名称 */
    label: string;
}

/** 插件配置（存于 config.json） */
export interface PluginConfig {
    /** 全局默认代码高亮主题，空字符串表示跟随思源原生主题 */
    defaultTheme: string;
}

/** 供运行时上下文使用的插件最小接口 */
export interface PluginRuntime {
    name: string;
    i18n: Record<string, string>;
    saveData(storageName: string, data: unknown): Promise<unknown>;
    loadData(storageName: string): Promise<unknown>;
}
