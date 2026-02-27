const APPENDIX_BITS = 128;

const ORDER_FLAGS_WIDTH = 32;
const BUILDER_WIDTH = 64;
const BUILDER_FEE_RATE_WIDTH = 16;

const ORDER_FLAGS_SHIFT = 0n;
const BUILDER_SHIFT = 32n;
const BUILDER_FEE_RATE_SHIFT = 96n;

const FIELD_MASKS = {
  orderFlags: (1n << BigInt(ORDER_FLAGS_WIDTH)) - 1n,
  builder: (1n << BigInt(BUILDER_WIDTH)) - 1n,
  builderFeeRate: (1n << BigInt(BUILDER_FEE_RATE_WIDTH)) - 1n
} as const;

export type OrderAppendixFields = {
  orderFlags: number;
  builder: string;
  builderFeeRate: number;
};

function parseBuilder(builder: string): bigint {
  if (!builder || builder.trim().length === 0) {
    throw new Error("InvalidBuilder");
  }

  const normalized = builder.trim();
  const isHex = /^0x[0-9a-fA-F]+$/.test(normalized);
  const isDecimal = /^\d+$/.test(normalized);

  if (!isHex && !isDecimal) {
    throw new Error("InvalidBuilder");
  }

  const value = BigInt(normalized);
  if (value < 0n || value > FIELD_MASKS.builder) {
    throw new Error("InvalidBuilder");
  }

  return value;
}

function assertRange(value: number, mask: bigint, fieldName: string): bigint {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }

  const numeric = BigInt(value);
  if (numeric > mask) {
    throw new Error(`${fieldName} exceeds allocated bit width`);
  }

  return numeric;
}

export function packOrderAppendix(fields: OrderAppendixFields): string {
  const orderFlags = assertRange(fields.orderFlags, FIELD_MASKS.orderFlags, "orderFlags");
  const builder = parseBuilder(fields.builder);
  const builderFeeRate = assertRange(fields.builderFeeRate, FIELD_MASKS.builderFeeRate, "builderFeeRate");

  const packed =
    (orderFlags << ORDER_FLAGS_SHIFT) |
    (builder << BUILDER_SHIFT) |
    (builderFeeRate << BUILDER_FEE_RATE_SHIFT);

  return packed.toString(2).padStart(APPENDIX_BITS, "0");
}

export function unpackOrderAppendix(appendix: string): OrderAppendixFields {
  if (!/^[01]{128}$/.test(appendix)) {
    throw new Error("Appendix must be a 128-bit binary string");
  }

  const packed = BigInt(`0b${appendix}`);

  const orderFlags = Number((packed >> ORDER_FLAGS_SHIFT) & FIELD_MASKS.orderFlags);
  const builder = ((packed >> BUILDER_SHIFT) & FIELD_MASKS.builder).toString();
  const builderFeeRate = Number((packed >> BUILDER_FEE_RATE_SHIFT) & FIELD_MASKS.builderFeeRate);

  return {
    orderFlags,
    builder,
    builderFeeRate
  };
}
