/** 控制台日志（前端插件运行于渲染进程，无法写 logs/ 文件） */
export const logger = {
    info(...args: unknown[]): void {
        console.log("[more-code-block-info]", ...args);
    },
    warn(...args: unknown[]): void {
        console.warn("[more-code-block-info]", ...args);
    },
    error(...args: unknown[]): void {
        console.error("[more-code-block-info]", ...args);
    },
};
