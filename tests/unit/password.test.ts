// Decision 2026-09-12: changing a password from the login screen.

import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, passwordProblem } from "@/domain/password";

describe("password policy", () => {
  it("accepts a new password of at least eight characters, confirmed, and different", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(passwordProblem({ current: "Demo1234", next: "NewPass123", confirm: "NewPass123" })).toBeNull();
    expect(passwordProblem({ current: "Demo1234", next: "12345678", confirm: "12345678" })).toBeNull();
  });

  it("names one reason, in form order: length, then confirmation, then sameness", () => {
    expect(passwordProblem({ current: "Demo1234", next: "short", confirm: "short" })).toBe("too_short");
    expect(passwordProblem({ current: "Demo1234", next: "", confirm: "" })).toBe("too_short");
    expect(passwordProblem({ current: "Demo1234", next: "NewPass123", confirm: "NewPass124" })).toBe("mismatch");
    expect(passwordProblem({ current: "Demo1234", next: "Demo1234", confirm: "Demo1234" })).toBe("same_as_current");
    // too short and mismatched: the length is reported first
    expect(passwordProblem({ current: "Demo1234", next: "abc", confirm: "abd" })).toBe("too_short");
  });

  it("does not trim: spaces are part of a password", () => {
    expect(passwordProblem({ current: "Demo1234", next: "  abcdef", confirm: "  abcdef" })).toBeNull();
    expect(passwordProblem({ current: "Demo1234", next: "Demo1234 ", confirm: "Demo1234 " })).toBeNull();
  });
});
