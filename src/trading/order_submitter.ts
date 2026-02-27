import { createHash } from "node:crypto";
import { packOrderAppendix, unpackOrderAppendix } from "./order_appendix_builder";

export type BuilderFeeMode = "fail_closed" | "fail_open";

export type SubmitOrderInput = {
  venue: "manual_trading" | "copy_engine";
  orderFlags: number;
  builder: string;
  builderFeeRate: number;
  policy: {
    builderFeeMode: BuilderFeeMode;
  };
};

export type SubmitOrderResult = {
  ok: boolean;
  errorCode: string | null;
  source_ref: string;
  audit: {
    digest: string;
    appendix: string;
    builder_id: string;
    builder_fee_rate: number;
  };
};

function digestAppendix(appendix: string): string {
  return createHash("sha256").update(appendix, "utf8").digest("hex").slice(0, 16);
}

export function submitOrder(input: SubmitOrderInput): SubmitOrderResult {
  try {
    const appendix = packOrderAppendix({
      orderFlags: input.orderFlags,
      builder: input.builder,
      builderFeeRate: input.builderFeeRate
    });

    const unpacked = unpackOrderAppendix(appendix);

    return {
      ok: true,
      errorCode: null,
      source_ref: `submitOrder.${input.venue}`,
      audit: {
        digest: digestAppendix(appendix),
        appendix,
        builder_id: unpacked.builder,
        builder_fee_rate: unpacked.builderFeeRate
      }
    };
  } catch (error) {
    if (error instanceof Error && error.message === "InvalidBuilder") {
      if (input.policy.builderFeeMode === "fail_open") {
        const appendix = packOrderAppendix({
          orderFlags: input.orderFlags,
          builder: "0",
          builderFeeRate: 0
        });

        return {
          ok: true,
          errorCode: null,
          source_ref: `submitOrder.${input.venue}.fail_open_fallback`,
          audit: {
            digest: digestAppendix(appendix),
            appendix,
            builder_id: "0",
            builder_fee_rate: 0
          }
        };
      }

      return {
        ok: false,
        errorCode: "InvalidBuilder",
        source_ref: `submitOrder.${input.venue}`,
        audit: {
          digest: "",
          appendix: "",
          builder_id: input.builder,
          builder_fee_rate: input.builderFeeRate
        }
      };
    }

    throw error;
  }
}
