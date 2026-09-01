import { describe, expect, it } from "vitest";
import { toAlternatingCase, toInverseCase, toSentenceCase, toTitleCase } from "./logic";

describe("case converter logic", () => {
  it("converts sentence boundaries without changing spacing", () => {
    expect(toSentenceCase("hELLO WORLD. hOW ARE YOU? fine! yes")).toBe(
      "Hello world. How are you? Fine! Yes",
    );
  });

  it("converts each word to title case", () => {
    expect(toTitleCase("a small TEST-case")).toBe("A Small Test-Case");
  });

  it("alternates by Unicode character rather than UTF-16 code unit", () => {
    expect(toAlternatingCase("a😀bc")).toBe("a😀bC");
  });

  it("inverts letters while preserving punctuation", () => {
    expect(toInverseCase("AbC 123!")).toBe("aBc 123!");
  });
});
