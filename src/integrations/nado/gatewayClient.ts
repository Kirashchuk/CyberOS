import { resolveNadoEndpoints, resolveNadoEnv, type NadoEndpoints } from "./config";
import { signExecuteEip712, type Eip712Domain, type Eip712Signer, type NadoExecuteTypedMessage } from "./signing";
import type { NadoEnv, NadoExecuteRequest, NadoExecuteResponse, NadoQueryRequest, NadoQueryResponse } from "./types";

export type NadoGatewayClientOptions = {
  env?: NadoEnv;
  endpoints?: Partial<NadoEndpoints>;
  fetchImpl?: typeof fetch;
};

export class NadoGatewayClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NadoGatewayClientOptions = {}) {
    const env = resolveNadoEnv(options.env);
    const endpoints = resolveNadoEndpoints(env, options.endpoints);
    this.baseUrl = endpoints.gatewayHttp;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async query<TData, TParams = Record<string, unknown>>(request: NadoQueryRequest<TParams>): Promise<NadoQueryResponse<TData>> {
    const response = await this.fetchImpl(`${this.baseUrl}/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    });
    return await response.json() as NadoQueryResponse<TData>;
  }

  async execute<TData = Record<string, unknown>, TPayload = Record<string, unknown>>(
    request: NadoExecuteRequest<TPayload>
  ): Promise<NadoExecuteResponse<TData>> {
    const response = await this.fetchImpl(`${this.baseUrl}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request)
    });
    return await response.json() as NadoExecuteResponse<TData>;
  }

  async executeSigned<TData = Record<string, unknown>, TPayload = Record<string, unknown>>(
    request: Omit<NadoExecuteRequest<TPayload>, "signature">,
    signing: {
      signer: Eip712Signer;
      domain: Eip712Domain;
      message: NadoExecuteTypedMessage;
    }
  ): Promise<NadoExecuteResponse<TData>> {
    const signature = await signExecuteEip712(signing.signer, {
      domain: signing.domain,
      message: signing.message
    });

    return this.execute<TData, TPayload>({
      ...request,
      signature
    });
  }
}
