import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeInstagramHandle, normalizeInstagramProfileUrl } from "../shared/instagramHandle";

const cases: Array<[string, string]> = [
  // Required cases
  ["instagram.com/foo", "foo"],
  ["https://www.instagram.com/foo/", "foo"],
  ["@foo", "foo"],
  ["foo", "foo"],
  ["instagram.com/foo/reel/abc", "foo"],
  // Extra edge cases
  ["  @Foo.Bar_1  ", "foo.bar_1"],
  ["www.instagram.com/foo?hl=en", "foo"],
  ["http://m.instagram.com/foo/#top", "foo"],
  ["https://instagram.com/@foo", "foo"],
  ["instagram.com/stories/foo/123", "foo"],
  ["https://www.instagram.com/instagram.com/foo/", "foo"], // already-doubled URL is repaired
  ["instagram.com/reel/abc", ""],
  ["https://www.instagram.com/p/abc/", ""],
  ["instagram.com", ""],
  ["https://tiktok.com/foo", ""],
  ["", ""],
  ["@", ""],
];

for (const [input, expected] of cases) {
  test(`normalizeInstagramHandle(${JSON.stringify(input)}) → ${JSON.stringify(expected)}`, () => {
    assert.equal(normalizeInstagramHandle(input), expected);
  });
}

test("normalizeInstagramProfileUrl never doubles the domain", () => {
  assert.equal(normalizeInstagramProfileUrl("instagram.com/foo"), "https://www.instagram.com/foo/");
  assert.equal(normalizeInstagramProfileUrl("instagram.com/foo/reel/abc"), "https://www.instagram.com/foo/");
  assert.equal(normalizeInstagramProfileUrl("instagram.com/reel/abc"), "");
});
