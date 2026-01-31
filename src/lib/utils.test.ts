import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn (utils)", () => {
  it("łączy klasy Tailwind", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("pomija wartości falsy", () => {
    expect(cn("a", false, "b", undefined, "c")).toBe("a b c");
  });

  it("obsługuje obiekty z warunkami", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active");
  });
});
