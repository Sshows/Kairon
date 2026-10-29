import type { Nodes, Paragraph, Root } from "mdast";

// OWASP uses details/summary only as labels around Markdown examples. Keep
// those labels without permitting arbitrary source HTML to become elements.
export function webMarkdownPlugin() {
  return (tree: Root) => {
    function visit(node: Nodes) {
      if (!("children" in node)) return;

      const children = node.children as Nodes[];
      const permitsParagraph = [
        "root",
        "blockquote",
        "listItem",
        "footnoteDefinition",
      ].includes(node.type);

      for (let index = 0; index < children.length; index++) {
        const child = children[index];
        if (permitsParagraph && child.type === "html") {
          const value = child.value.trim();
          if (/^<\/?details>$/i.test(value)) {
            children.splice(index--, 1);
            continue;
          }

          const summary =
            /^(?:<details>\s*)?<summary>([^<>]*)<\/summary>\s*(?:<\/details>)?$/i.exec(
              value,
            );
          if (summary) {
            const label: Paragraph = {
              type: "paragraph",
              children: [{ type: "text", value: summary[1].trim() }],
            };
            children[index] = label;
            continue;
          }
        }
        visit(child);
      }
    }

    visit(tree);
  };
}
