import { describe, expect, it } from "vitest";
import { matchesQuery, searchText } from "./search";

const book = {
  title: "Norwegian Wood",
  original_title: "ノルウェイの森",
  series: null,
  credits: [{ name: "Haruki Murakami" }, { name: "Jay Rubin" }],
};

describe("book search", () => {
  const text = searchText(book);
  it("ignores case and accents", () => {
    expect(matchesQuery(text, "MURAKAMI")).toBe(true);
    expect(matchesQuery(searchText({ title: "Vita Sexualis", credits: [{ name: "Mori Ōgai" }] }), "ogai")).toBe(true);
  });
  it("finds a book by any credited name, including the translator", () => {
    expect(matchesQuery(text, "rubin")).toBe(true);
  });
  it("finds the original title", () => {
    expect(matchesQuery(text, "ノルウェイ")).toBe(true);
  });
  it("needs every word, in any order", () => {
    expect(matchesQuery(text, "wood murakami")).toBe(true);
    expect(matchesQuery(text, "wood tolstoy")).toBe(false);
  });
  it("matches everything when the query is empty", () => {
    expect(matchesQuery(text, "   ")).toBe(true);
  });
});
