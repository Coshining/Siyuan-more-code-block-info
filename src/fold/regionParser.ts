import type { FoldRegion } from "../types";

const INDENT_TAB = 4;

function indentOf(line: string): number {
    let n = 0;
    for (const ch of line) {
        if (ch === " ") {
            n += 1;
        } else if (ch === "\t") {
            n += INDENT_TAB;
        } else {
            break;
        }
    }
    return n;
}

function braceNet(line: string): number {
    let n = 0;
    for (const ch of line) {
        if (ch === "{") {
            n += 1;
        } else if (ch === "}") {
            n -= 1;
        }
    }
    return n;
}

/**
 * 计算代码块内可折叠区间：
 * - brace：基于花括号平衡
 * - indent：基于缩进层级（跳过空行）
 * 返回以起始行为键的区间映射。
 */
export function computeFoldRegions(lines: string[]): Map<number, FoldRegion> {
    const regions = new Map<number, FoldRegion>();
    const indents = lines.map(indentOf);

    // 括号平衡折叠
    const stack: { line: number; depth: number }[] = [];
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
        const net = braceNet(lines[i]);
        if (net === 0) {
            continue;
        }
        const before = depth;
        depth = Math.max(0, depth + net);
        if (net > 0) {
            stack.push({ line: i, depth: before });
        } else {
            while (stack.length > 0 && depth <= stack[stack.length - 1].depth) {
                const open = stack.pop()!;
                if (i > open.line && !regions.has(open.line)) {
                    regions.set(open.line, {
                        start: open.line,
                        end: i,
                        depth: indents[open.line],
                        kind: "brace",
                    });
                }
            }
        }
    }

    // 缩进折叠
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") {
            // 空行不作为折叠起点，避免箭头出现在空行上
            continue;
        }
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") {
            j += 1;
        }
        if (j >= lines.length || indents[j] <= indents[i]) {
            continue;
        }
        let end = j;
        while (end + 1 < lines.length) {
            const next = lines[end + 1];
            if (next.trim() === "" || indents[end + 1] > indents[i]) {
                end += 1;
            } else {
                break;
            }
        }
        // 末尾的空行属于下一段代码的分隔，不纳入折叠范围
        while (end > j && lines[end].trim() === "") {
            end -= 1;
        }
        if (!regions.has(i)) {
            regions.set(i, { start: i, end, depth: indents[i], kind: "indent" });
        }
    }

    return regions;
}
