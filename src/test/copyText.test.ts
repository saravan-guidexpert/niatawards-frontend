import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextWithFallback } from "@/lib/copyText";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyTextWithFallback", () => {
  it("uses the clipboard API when it is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyTextWithFallback("hello", "x.tsv")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("falls back to a textarea copy when the clipboard API rejects", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) } });
    document.execCommand = vi.fn().mockReturnValue(true);
    await expect(copyTextWithFallback("hello", "x.tsv")).resolves.toBe("copied");
  });
});
