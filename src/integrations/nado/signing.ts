export type Eip712TypeField = {
  name: string;
  type: string;
};

export type Eip712Domain = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export type NadoExecuteTypedMessage = {
  subaccountId: string;
  nonce: string;
  expiry: string;
  actionHash: string;
};

export type Eip712Signer = {
  signTypedData(input: {
    domain: Eip712Domain;
    types: Record<string, Eip712TypeField[]>;
    primaryType: string;
    message: NadoExecuteTypedMessage;
  }): Promise<string>;
};

const EXECUTE_PRIMARY_TYPE = "Execute";

const EXECUTE_TYPES: Record<string, Eip712TypeField[]> = {
  EIP712Domain: [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" }
  ],
  Execute: [
    { name: "subaccountId", type: "string" },
    { name: "nonce", type: "uint64" },
    { name: "expiry", type: "uint64" },
    { name: "actionHash", type: "bytes32" }
  ]
};

export async function signExecuteEip712(
  signer: Eip712Signer,
  input: {
    domain: Eip712Domain;
    message: NadoExecuteTypedMessage;
  }
): Promise<string> {
  return signer.signTypedData({
    domain: input.domain,
    types: EXECUTE_TYPES,
    primaryType: EXECUTE_PRIMARY_TYPE,
    message: input.message
  });
}
