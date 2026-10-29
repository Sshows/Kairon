import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import { describe, expect, it } from "vitest";
import { webMarkdownPlugin } from "../src/lib/web-markdown";

function render(source: string) {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      { remarkPlugins: [webMarkdownPlugin], skipHtml: true },
      source,
    ),
  );
}

describe("safe presentation of source example labels", () => {
  it("keeps the distinction between bad and good examples without raw wrapper tags", () => {
    const html = render(
      "<details>\n<summary>Bad example: trusting a supplied tenant</summary>\n\nFirst example.\n\n</details>\n\n<details>\n<summary>Good example: checking the session</summary>\n\nSecond example.\n\n</details>",
    );
    expect(html).toContain("<p>Bad example: trusting a supplied tenant</p>");
    expect(html).toContain("<p>Good example: checking the session</p>");
    expect(html).toContain("<p>First example.</p>");
    expect(html).toContain("<p>Second example.</p>");
    expect(html).not.toContain("details");
    expect(html).not.toContain("summary");
  });

  it("leaves the same strings in fenced code examples unchanged", () => {
    const html = render(
      "~~~html\n<details>\n<summary>Literal code label</summary>\n</details>\n~~~",
    );
    expect(html).toContain(
      "&lt;details&gt;\n&lt;summary&gt;Literal code label&lt;/summary&gt;\n&lt;/details&gt;\n",
    );
    expect(html).toContain('<pre><code class="language-html">');
  });

  it("does not turn unrecognised or executable HTML into elements", () => {
    const html = render(
      '<script>alert("run")</script>\n\n<details onclick="run()">\n<summary><img src=x onerror="run()"></summary>\n\nOrdinary Markdown remains.\n\n</details>',
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("onerror");
    expect(html).toContain("Ordinary Markdown remains.");
  });
});
