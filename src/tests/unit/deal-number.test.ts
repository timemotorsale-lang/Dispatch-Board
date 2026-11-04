import { describe, expect, it } from "vitest";
import { formatDealNumber } from "@/lib/deal-number";
describe("deal numbers", () => {
 it("formats assigned numbers without recycling or truncating them", () => {
  expect(formatDealNumber(1000)).toBe("1000");
  expect(formatDealNumber("1234")).toBe("1234");
  expect(formatDealNumber(10000)).toBe("10000");
 });
 it.each([undefined, null, 0, -1, 1.5, "internal-uuid", "12x", Infinity])("does not invent a number for %s", value => {
  expect(formatDealNumber(value)).toBe("");
 });
});
