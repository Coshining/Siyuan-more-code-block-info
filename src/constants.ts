import type { ThemeOption } from "./types";

/** 块自定义属性：代码块名称 */
export const ATTR_NAME = "custom-code-block-name";
/** 块自定义属性：每块独立高亮主题 */
export const ATTR_THEME = "custom-code-block-theme";
/** 块自定义属性：整块收起状态 */
export const ATTR_FOLD = "custom-code-block-fold";

/** 注入完成标记，避免重复注入 */
export const MARKER = "data-more-code-info";

/** 名称最大字符数 */
export const NAME_MAX_LENGTH = 20;

/** 高亮主题 CSS 基址 */
export const HLJS_STYLE_BASE = "/stage/protyle/js/highlight.js/styles/";
/** highlight.js 版本 */
export const HLJS_VERSION = "11.12.0";

/** 表示「跟随思源原生主题」的空值 */
export const FOLLOW_SIYUAN = "";

/** 常用高亮主题列表 */
export const THEME_OPTIONS: ThemeOption[] = [
    { name: "github", label: "GitHub" },
    { name: "github-dark", label: "GitHub Dark" },
    { name: "vs", label: "Visual Studio" },
    { name: "vs2015", label: "VS 2015" },
    { name: "xcode", label: "Xcode" },
    { name: "atom-one-light", label: "Atom One Light" },
    { name: "atom-one-dark", label: "Atom One Dark" },
    { name: "monokai", label: "Monokai" },
    { name: "nord", label: "Nord" },
    { name: "base16/dracula", label: "Dracula" },
    { name: "tokyo-night-dark", label: "Tokyo Night Dark" },
    { name: "default", label: "Default" },
];
