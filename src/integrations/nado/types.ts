export type NadoEnv = "mainnet" | "testnet";

export type NadoSubaccountInfoDto = {
  subaccountId: string;
  owner: string;
  accountValue: string;
  freeCollateral: string;
  marginRatio: string;
  updatedAt: string;
};

export type NadoOrderSide = "buy" | "sell";
export type NadoOrderStatus = "open" | "filled" | "cancelled" | "rejected" | "expired";

export type NadoOrderDto = {
  orderId: string;
  subaccountId: string;
  market: string;
  side: NadoOrderSide;
  price: string;
  size: string;
  filledSize: string;
  status: NadoOrderStatus;
  timeInForce?: string;
  createdAt: string;
  updatedAt?: string;
};

export type NadoSubaccountOrdersDto = {
  subaccountId: string;
  orders: NadoOrderDto[];
};

export type NadoOrderMatchDto = {
  matchId: string;
  orderId: string;
  market: string;
  side: NadoOrderSide;
  price: string;
  size: string;
  fee: string;
  liquidity: "maker" | "taker";
  matchedAt: string;
};

export type NadoMatchesOrdersHistoryDto = {
  subaccountId: string;
  orders: NadoOrderDto[];
  matches: NadoOrderMatchDto[];
  cursor?: string;
};

export type NadoQueryRequest<TParams = Record<string, unknown>> = {
  method: string;
  params?: TParams;
};

export type NadoExecuteRequest<TPayload = Record<string, unknown>> = {
  action: string;
  payload: TPayload;
  signature?: string;
};

export type NadoQueryResponse<TData> = {
  ok: boolean;
  data: TData;
  source_ref?: string;
};

export type NadoExecuteResponse<TData = Record<string, unknown>> = {
  ok: boolean;
  txHash?: string;
  data?: TData;
  source_ref?: string;
};

export type NadoSubscriptionChannel = {
  channel: string;
  params?: Record<string, unknown>;
};

export type NadoSubscriptionMessage<T = unknown> = {
  channel: string;
  type: string;
  data: T;
  source_ref?: string;
};
