import { describe, it, expect } from "vitest";
import { isClickbaitTitle } from "./clickbait";

describe("isClickbaitTitle — thumbnail-shout proxy", () => {
  it("keeps normal Islamic titles", () => {
    expect(isClickbaitTitle("The Life of the Prophet ﷺ — Part 3")).toBe(false);
    expect(isClickbaitTitle("Understanding Surah Al-Kahf with Yasir Qadhi")).toBe(false);
    expect(isClickbaitTitle("How to build khushu in salah")).toBe(false);
  });

  it("suppresses ALL-CAPS shouty titles", () => {
    expect(isClickbaitTitle("THIS ONE HABIT WILL CHANGE YOUR LIFE")).toBe(true);
    expect(isClickbaitTitle("MUST WATCH — the ULTIMATE guide")).toBe(true);
  });

  it("suppresses tabloid phrases", () => {
    expect(isClickbaitTitle("You won't believe what happened next")).toBe(true);
    expect(isClickbaitTitle("Wait until you see this reaction")).toBe(true);
    expect(isClickbaitTitle("Exposed! The truth about modern imams")).toBe(true);
  });

  it("suppresses ?! and !? clickbait punctuation", () => {
    expect(isClickbaitTitle("Did he really say this?!")).toBe(true);
    expect(isClickbaitTitle("Look what happened next!?")).toBe(true);
  });

  it("suppresses emoji-density abuse (>=3 emoji)", () => {
    expect(isClickbaitTitle("Amazing lecture 😱🤯😳 you must see")).toBe(true);
  });

  it("leaves Arabic/Urdu titles alone (no case system)", () => {
    expect(isClickbaitTitle("سورة البقرة كاملة")).toBe(false);
    expect(isClickbaitTitle("قرآن پاک کی تلاوت")).toBe(false);
  });
});
