import { describe, expect, it } from "vitest";
import { byline, creditNotes, joinNames, seriesLabel, volumesLabel } from "./catalogue";
import type { Credit } from "./types";

const c = (name: string, role: Credit["role"]): Credit => ({ name, role });

describe("byline", () => {
  it("joins one, two and three authors the way a person would say them", () => {
    expect(byline([c("Mitch Albom", "author")])).toBe("Mitch Albom");
    expect(byline([c("Ichiro Kishimi", "author"), c("Fumitake Koga", "author")])).toBe("Ichiro Kishimi and Fumitake Koga");
    expect(byline([c("Sandy Wight", "author"), c("Mick Hager", "author"), c("Steve Tyink", "author")])).toBe("Sandy Wight, Mick Hager and Steve Tyink");
  });
  it("names a manga creator once when they wrote and drew it", () => {
    expect(byline([c("Tatsuki Fujimoto", "story"), c("Tatsuki Fujimoto", "art")])).toBe("Tatsuki Fujimoto");
  });
  it("splits story and art when different people did them", () => {
    expect(byline([c("Tsugumi Ohba", "story"), c("Takeshi Obata", "art")])).toBe("Story by Tsugumi Ohba · Art by Takeshi Obata");
  });
  it("leaves translators out of the byline and puts them in the notes", () => {
    const credits = [c("Mieko Kawakami", "author"), c("Sam Bett", "translator"), c("David Boyd", "translator")];
    expect(byline(credits)).toBe("Mieko Kawakami");
    expect(creditNotes(credits)).toBe("translated by Sam Bett and David Boyd");
  });
  it("returns empty strings rather than stray punctuation", () => {
    expect(byline([])).toBe("");
    expect(creditNotes([c("A", "author")])).toBe("");
    expect(joinNames([])).toBe("");
  });
});

describe("series and volumes", () => {
  it("labels a numbered series and a bare one", () => {
    expect(seriesLabel("Morisaki Bookshop", 2)).toBe("Morisaki Bookshop #2");
    expect(seriesLabel("Bhujang Shetty", null)).toBe("Bhujang Shetty");
    expect(seriesLabel(null, 3)).toBe("");
  });
  it("labels volume progress", () => {
    expect(volumesLabel(7, 12)).toBe("Vol. 7 of 12");
    expect(volumesLabel(1, null)).toBe("1 volume read");
    expect(volumesLabel(null, 12)).toBe("12 volumes");
    expect(volumesLabel(null, null)).toBe("");
  });
});
