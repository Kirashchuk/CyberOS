import { describe, expect, test } from "bun:test";
import { parseNadoEnv, resolveNadoEndpoints } from "./config";

describe("nado config", () => {
  test("parseNadoEnv supports mainnet/testnet", () => {
    expect(parseNadoEnv(undefined)).toBe("mainnet");
    expect(parseNadoEnv("mainnet")).toBe("mainnet");
    expect(parseNadoEnv("testnet")).toBe("testnet");
  });

  test("resolveNadoEndpoints validates env against urls", () => {
    expect(() =>
      resolveNadoEndpoints("mainnet", {
        gatewayHttp: "https://api.testnet.nado.trade/gateway"
      })
    ).toThrow();
  });
});
