import { resolveNadoEndpoints, resolveNadoEnv, type NadoEndpoints } from "./config";
import type {
  NadoEnv,
  NadoMatchesOrdersHistoryDto,
  NadoOrderDto,
  NadoQueryResponse,
  NadoSubaccountInfoDto,
  NadoSubaccountOrdersDto
} from "./types";

export type NadoArchiveClientOptions = {
  env?: NadoEnv;
  endpoints?: Partial<NadoEndpoints>;
  fetchImpl?: typeof fetch;
};

export class NadoArchiveClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: NadoArchiveClientOptions = {}) {
    const env = resolveNadoEnv(options.env);
    const endpoints = resolveNadoEndpoints(env, options.endpoints);
    this.baseUrl = endpoints.archiveHttp;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getSubaccountInfo(subaccountId: string): Promise<NadoQueryResponse<NadoSubaccountInfoDto>> {
    return this.postQuery<NadoSubaccountInfoDto>("subaccount_info", { subaccountId });
  }

  async getSubaccountOrders(subaccountId: string): Promise<NadoQueryResponse<NadoSubaccountOrdersDto>> {
    return this.postQuery<NadoSubaccountOrdersDto>("subaccount_orders", { subaccountId });
  }

  async getOrder(orderId: string): Promise<NadoQueryResponse<NadoOrderDto>> {
    return this.postQuery<NadoOrderDto>("order", { orderId });
  }

  async getMatchesOrdersHistory(params: {
    subaccountId: string;
    cursor?: string;
    limit?: number;
  }): Promise<NadoQueryResponse<NadoMatchesOrdersHistoryDto>> {
    return this.postQuery<NadoMatchesOrdersHistoryDto>("matches/orders", params);
  }

  private async postQuery<TData>(method: string, params: Record<string, unknown>): Promise<NadoQueryResponse<TData>> {
    const response = await this.fetchImpl(`${this.baseUrl}/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method, params })
    });
    return await response.json() as NadoQueryResponse<TData>;
  }
}
