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

/** 块内折叠区间（行号为 0 起始） */
export interface FoldRegion {
    /** 区间起始行（保持可见的标题行） */
    start: number;
    /** 区间结束行（含），start 之后到 end 的行可被折叠隐藏 */
    end: number;
    /** 标题行缩进层级 */
    depth: number;
    kind: "brace" | "indent";
}

/** 供运行时上下文使用的插件最小接口 */
export interface PluginRuntime {
    name: string;
    i18n: Record<string, string>;
    saveData(storageName: string, data: unknown): Promise<unknown>;
    loadData(storageName: string): Promise<unknown>;
}
