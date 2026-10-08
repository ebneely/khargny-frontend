// A page container gets its side gutter from its class. An inline shorthand `padding` on the
// same element wins over the class and sets the sides to 0, which is how the saved plan page
// lost its left and right margin on phones.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "src");

function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

test("no gutter container cancels its own side padding with an inline shorthand", () => {
  const offenders = [];
  for (const file of sources(root)) {
    const text = fs.readFileSync(file, "utf8");
    const tag = /className="khg-[a-z-]*container"[^>]*?>/gs;
    for (const match of text.matchAll(tag)) {
      if (/\bpadding:\s/.test(match[0])) {
        const line = text.slice(0, match.index).split("\n").length;
        offenders.push(`${path.relative(root, file)}:${line}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "use paddingBlock on a container, never the padding shorthand");
});
