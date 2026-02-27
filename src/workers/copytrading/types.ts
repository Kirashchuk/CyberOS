export type CopyTradingState = "running" | "paused" | "error" | "stopped";

export type LeaderEventType = "position_change" | "fill";

export type PositionSide = "long" | "short";

export type PositionSnapshot = {
  market: string;
  size: number;
  side: PositionSide;
  markPrice?: number;
};

export type LeaderEvent = {
  type: LeaderEventType;
  leaderId: string;
  market: string;
  size: number;
  side: PositionSide;
  fillPrice?: number;
  timestamp: number;
  source_ref: string;
};

export type SubaccountInfo = {
  positions: PositionSnapshot[];
  accountValue: number;
  marginUsed: number;
  source_ref: string;
};

export type CopyTradingConfig = {
  leaderId: string;
  followerId: string;
  multiplier: number;
  sizingMode: "C1" | "C2";
  maxExposureUsd: number;
  perMarketCapUsd: Record<string, number>;
  stopLossPctByMarket: Record<string, number>;
  liquidationBufferPct: number;
  reconcileIntervalMs: number;
};

export type OrderIntent = {
  market: string;
  side: PositionSide;
  targetSize: number;
  reduceOnly?: boolean;
  reason: "event" | "reconcile" | "risk_guard";
  source_ref: string;
};

export type ExecutionResult = {
  accepted: boolean;
  orderId?: string;
  source_ref: string;
};

export type SubscriptionHandle = {
  unsubscribe: () => Promise<void>;
};

export interface LeaderStream {
  subscribe(
    leaderId: string,
    eventType: LeaderEventType,
    handler: (event: LeaderEvent) => Promise<void>
  ): Promise<SubscriptionHandle>;
}

export interface ExchangeGateway {
  getSubaccountInfo(subaccountId: string): Promise<SubaccountInfo>;
  executeIntent(intent: OrderIntent, idempotencyKey: string): Promise<ExecutionResult>;
}

export type SessionSigner = {
  provider: "privy";
  sessionId: string;
  sign: (payload: string) => Promise<string>;
};
