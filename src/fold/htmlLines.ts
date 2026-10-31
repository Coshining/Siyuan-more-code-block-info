/**
 * 将高亮后的 HTML 按换行拆分为每行的 HTML 片段，完整保留原有的 span 结构与样式。
 * 跨行的元素会在每一行克隆出对应的开始/结束标签，避免重新高亮导致样式丢失或错乱。
 */
export function splitLinesFromHtml(html: string): string[] {
    const source = document.createElement("div");
    source.innerHTML = html;

    const lines: string[] = [];
    let currentLine = document.createElement("div");
    let containers: HTMLElement[] = [currentLine];

    const currentContainer = (): HTMLElement => containers[containers.length - 1];

    // 结束当前行，并为下一行重新克隆当前打开的元素链
    const pushLine = (): void => {
        lines.push(currentLine.innerHTML);
        const nextLine = document.createElement("div");
        const nextContainers: HTMLElement[] = [nextLine];
        for (let i = 1; i < containers.length; i++) {
            const clone = containers[i].cloneNode(false) as HTMLElement;
            nextContainers[nextContainers.length - 1].appendChild(clone);
            nextContainers.push(clone);
        }
        currentLine = nextLine;
        containers = nextContainers;
    };

    const appendText = (text: string): void => {
        const parts = text.split("\n");
        for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
                pushLine();
            }
            if (parts[i]) {
                currentContainer().appendChild(document.createTextNode(parts[i]));
            }
        }
    };

    const walk = (node: Node): void => {
        if (node.nodeType === Node.TEXT_NODE) {
            appendText(node.nodeValue ?? "");
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        const element = node as HTMLElement;
        if (!(element.textContent ?? "").includes("\n")) {
            currentContainer().appendChild(element.cloneNode(true));
            return;
        }
        const clone = element.cloneNode(false) as HTMLElement;
        currentContainer().appendChild(clone);
        containers.push(clone);
        for (const child of Array.from(element.childNodes)) {
            walk(child);
        }
        containers.pop();
    };

    for (const child of Array.from(source.childNodes)) {
        walk(child);
    }
    lines.push(currentLine.innerHTML);
    return lines;
}
