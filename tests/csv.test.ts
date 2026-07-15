import { describe, expect, it } from "vitest";
import { buildCsv, withBom } from "@/lib/csv";

describe("buildCsv", () => {
  it("行と列をCRLF/カンマで結合する", () => {
    const csv = buildCsv([
      ["a", "b", 1],
      ["c", 2, null],
    ]);
    expect(csv).toBe("a,b,1\r\nc,2,");
  });

  it("カンマ・改行・ダブルクォートを含む値をエスケープする", () => {
    const csv = buildCsv([["a,b", 'say "hi"', "line1\nline2"]]);
    expect(csv).toBe('"a,b","say ""hi""","line1\nline2"');
  });

  it("null/undefinedは空文字になる", () => {
    expect(buildCsv([[null, undefined, ""]])).toBe(",,");
  });
});

describe("withBom", () => {
  it("先頭にBOM(U+FEFF)を付与する", () => {
    const result = withBom("a,b");
    expect(result.charCodeAt(0)).toBe(0xfeff);
    expect(result.slice(1)).toBe("a,b");
  });
});
