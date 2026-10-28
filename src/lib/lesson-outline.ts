export function lessonSections(markdown: string) {
  const sections: { id: string; title: string; markdown: string }[] = [];
  let fence: string | null = null;
  let current = { id: "lesson-intro", title: "", markdown: "" };
  const lines = markdown.split("\n");
  for (const [index, line] of lines.entries()) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length)
        fence = null;
    }
    const heading = !fence && line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) {
      if (current.markdown.trim()) sections.push(current);
      current = {
        id: `lesson-section-${sections.length + 1}`,
        title: heading[1],
        markdown: "",
      };
    }
    current.markdown += line + (index < lines.length - 1 ? "\n" : "");
  }
  if (current.markdown.trim()) sections.push(current);
  return sections;
}
