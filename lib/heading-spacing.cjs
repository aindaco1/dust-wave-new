// Old posts used bare <br>, </br>, and paragraphs containing only breaks to
// space headings. Remove only those heading-adjacent spacers at render time;
// authored line breaks inside prose and credits remain intact.
function normalizeHeadingSpacing(html = "") {
  const br = String.raw`<\/?br\s*\/?>`;
  const spacer = String.raw`(?:${br}|<p>\s*(?:${br}\s*)+<\/p>)`;
  return html
    .replace(new RegExp(String.raw`(?:${spacer}\s*)+(?=<h[1-6]\b)`, "gi"), "")
    .replace(new RegExp(String.raw`(<\/h[1-6]>)\s*(?:${spacer}\s*)+`, "gi"), "$1\n")
    .replace(new RegExp(String.raw`(?:${br}\s*)+(<\/p>\s*<h[1-6]\b)`, "gi"), "$1")
    .replace(new RegExp(String.raw`(<\/h[1-6]>\s*<p>)\s*(?:${br}\s*)+`, "gi"), "$1");
}

module.exports = { normalizeHeadingSpacing };
