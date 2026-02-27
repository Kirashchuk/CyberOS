import { describe, expect, test } from "bun:test";
import { packOrderAppendix, unpackOrderAppendix } from "./order_appendix_builder";

describe("order appendix builder", () => {
  test("packs and unpacks configured fields into 128-bit appendix", () => {
    const appendix = packOrderAppendix({
      orderFlags: 13,
      builder: "255",
      builderFeeRate: 44
    });

    expect(appendix).toHaveLength(128);
    expect(appendix).toMatch(/^[01]{128}$/);

    const unpacked = unpackOrderAppendix(appendix);
    expect(unpacked).toEqual({
      orderFlags: 13,
      builder: "255",
      builderFeeRate: 44
    });
  });

  test("throws InvalidBuilder for malformed builder ids", () => {
    expect(() =>
      packOrderAppendix({
        orderFlags: 1,
        builder: "builder-x",
        builderFeeRate: 1
      })
    ).toThrow("InvalidBuilder");
  });
});
