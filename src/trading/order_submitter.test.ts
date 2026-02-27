import { describe, expect, test } from "bun:test";
import { submitOrder } from "./order_submitter";

describe("submitOrder", () => {
  test("fails closed on invalid builder", () => {
    const result = submitOrder({
      venue: "copy_engine",
      orderFlags: 2,
      builder: "invalid",
      builderFeeRate: 10,
      policy: { builderFeeMode: "fail_closed" }
    });

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("InvalidBuilder");
  });

  test("falls open on invalid builder when policy allows", () => {
    const result = submitOrder({
      venue: "copy_engine",
      orderFlags: 2,
      builder: "invalid",
      builderFeeRate: 10,
      policy: { builderFeeMode: "fail_open" }
    });

    expect(result.ok).toBe(true);
    expect(result.errorCode).toBeNull();
    expect(result.audit.builder_id).toBe("0");
    expect(result.audit.builder_fee_rate).toBe(0);
    expect(result.audit.appendix).toHaveLength(128);
  });
});
