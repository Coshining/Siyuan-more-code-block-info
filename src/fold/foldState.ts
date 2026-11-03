/**
 * 折叠状态与结构签名。
 *
 * 折叠状态按「起始行号」记录，编辑过程中行号会平移（回车、退格），
 * 这里根据新旧文本的公共前缀 / 后缀把旧行号翻译到新文本，
 * 避免插入 / 删除一行后已折叠的代码被意外展开或折叠错位。
 */

import type { FoldRegion } from "../types";

/** 重映射折叠状态 */
export function remapFolded(folded: Set<number>, oldItems: string[], newItems: string[]): Set<number> {
    if (folded.size === 0) {
        return folded;
    }
    if (oldItems.length === newItems.length) {
        // 行数没变时行号无需平移（行内编辑、折叠起始行本身的修改都保持折叠）
        return folded;
    }
    let prefix = 0;
    while (prefix < oldItems.length && prefix < newItems.length && oldItems[prefix] === newItems[prefix]) {
        prefix += 1;
    }
    let suffix = 0;
    while (
        suffix < oldItems.length - prefix &&
        suffix < newItems.length - prefix &&
        oldItems[oldItems.length - 1 - suffix] === newItems[newItems.length - 1 - suffix]
    ) {
        suffix += 1;
    }
    const delta = newItems.length - oldItems.length;
    const oldTailStart = oldItems.length - suffix;
    const result = new Set<number>();
    folded.forEach((start) => {
        if (start < prefix) {
            result.add(start);
        } else if (start >= oldTailStart) {
            result.add(start + delta);
        } else if (start === prefix) {
            // 改动正好从折叠起始行开始（例如在该行回车），起始行未变，保持折叠
            result.add(start);
        }
        // 其余落在改动区间内的折叠起点直接丢弃（其所在区域已经变了）
    });
    return result;
}

/** 结构签名：行数 + 可折叠区间 + 折叠状态；结构未变就不重建 DOM */
export function buildSignature(lineCount: number, regions: Map<number, FoldRegion>, folded: Set<number>): string {
    const parts: string[] = [String(lineCount)];
    regions.forEach((region, start) => {
        parts.push(`${start}-${region.end}${folded.has(start) ? "*" : ""}`);
    });
    return parts.join("|");
}
