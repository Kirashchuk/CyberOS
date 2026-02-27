import { describe, expect, mock, test } from "bun:test";
import { signExecuteEip712 } from "./signing";

describe("signExecuteEip712", () => {
  test("delegates EIP-712 signing to signer", async () => {
    const signTypedData = mock(async () => "0xsigned");
    const signer = { signTypedData };

    const signature = await signExecuteEip712(signer, {
      domain: {
        name: "NADO",
        version: "1",
        chainId: 1,
        verifyingContract: "0x0000000000000000000000000000000000000001"
      },
      message: {
        subaccountId: "sub-1",
        nonce: "1",
        expiry: "1710000000",
        actionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      }
    });

    expect(signature).toBe("0xsigned");
    expect(signTypedData).toHaveBeenCalledTimes(1);
  });
});
