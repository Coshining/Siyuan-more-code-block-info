import { fetchPost } from "siyuan";

/** 写入块自定义属性 */
export function setBlockAttr(id: string, key: string, value: string): void {
    if (!id) {
        return;
    }
    fetchPost(
        "/api/attr/setBlockAttrs",
        { id, attrs: { [key]: value } },
        () => {
            // 忽略响应，失败时仅记录
        },
    );
}

/** 删除块自定义属性（setBlockAttrs 传 null 表示删除） */
export function removeBlockAttr(id: string, key: string): void {
    if (!id) {
        return;
    }
    fetchPost(
        "/api/attr/setBlockAttrs",
        { id, attrs: { [key]: null } },
        () => {
            // 忽略响应
        },
    );
}

/** 读取块 ID */
export function getBlockId(block: HTMLElement): string {
    return block.getAttribute("data-node-id") ?? "";
}
