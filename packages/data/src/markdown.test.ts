import { describe, expect, it } from "vitest";
import { splitAfterParagraphs } from "./markdown";

describe("splitAfterParagraphs", () => {
  it("cuts after the second paragraph", () => {
    const [a, b] = splitAfterParagraphs("One.\n\nTwo.\n\nThree.\n\nFour.", 2);
    expect(a).toBe("One.\n\nTwo.");
    expect(b).toBe("Three.\n\nFour.");
  });
  it("doesn't count quotes or headings as paragraphs", () => {
    const [a, b] = splitAfterParagraphs("One.\n\n> A quote.\n\n## Heading\n\nTwo.\n\nThree.", 2);
    expect(a).toContain("> A quote.");
    expect(a.endsWith("Two.")).toBe(true);
    expect(b).toBe("Three.");
  });
  it("keeps a code block with blank lines whole", () => {
    const [, b] = splitAfterParagraphs("One.\n\nTwo.\n\n```\nx\n\ny\n```", 2);
    expect(b).toBe("```\nx\n\ny\n```");
  });
  it("puts everything before the image when there are two paragraphs or fewer", () => {
    expect(splitAfterParagraphs("Only one.", 2)).toEqual(["Only one.", ""]);
    expect(splitAfterParagraphs("One.\n\nTwo.", 2)).toEqual(["One.\n\nTwo.", ""]);
  });
});
