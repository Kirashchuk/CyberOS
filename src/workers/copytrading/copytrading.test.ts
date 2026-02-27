import { describe, expect, test } from "bun:test";
import { buildIntentIdempotencyKey } from "./idempotency";
import { applyRiskControls } from "./risk";
import { CopyTradingStateMachine } from "./stateMachine";
import { CopyTradingWorker } from "./engine";
import type { CopyTradingConfig, ExchangeGateway, LeaderEventType, LeaderStream, SessionSigner, SubaccountInfo, SubscriptionHandle } from "./types";

describe("CopyTradingStateMachine", () => {
  test("transitions across running paused error stopped", () => {
    const machine = new CopyTradingStateMachine();
    machine.start();
    expect(machine.current).toBe("running");
    machine.pause();
    expect(machine.current).toBe("paused");
    machine.resume();
    expect(machine.current).toBe("running");
    machine.fail("boom");
    expect(machine.current).toBe("error");
    expect(machine.lastError).toBe("boom");
    machine.stop();
    expect(machine.current).toBe("stopped");
  });
});

describe("idempotency", () => {
  test("builds deterministic key per bucket", () => {
    const now = Date.now;
    Date.now = () => 10_000;
    const key1 = buildIntentIdempotencyKey({ market: "BTC", side: "long", targetSize: 1, reason: "event", source_ref: "x" });
    const key2 = buildIntentIdempotencyKey({ market: "BTC", side: "long", targetSize: 1, reason: "event", source_ref: "x" });
    Date.now = now;
    expect(key1).toBe(key2);
  });
});

describe("risk controls", () => {
  test("blocks when exceeding max exposure", () => {
    const decision = applyRiskControls(
      { market: "BTC", side: "long", targetSize: 10, reason: "event", source_ref: "x" },
      {
        leaderId: "l",
        followerId: "f",
        multiplier: 1,
        sizingMode: "C1",
        maxExposureUsd: 100,
        perMarketCapUsd: {},
        stopLossPctByMarket: {},
        liquidationBufferPct: 0.1,
        reconcileIntervalMs: 1_000
      },
      {
        positions: [],
        accountValue: 1_000,
        marginUsed: 10,
        source_ref: "acct"
      },
      20
    );

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("max_exposure_exceeded");
  });
});

describe("CopyTradingWorker", () => {
  test("subscribes to leader events and executes through session signer", async () => {
    const handlers: Partial<Record<LeaderEventType, (event: any) => Promise<void>>> = {};
    const stream: LeaderStream = {
      async subscribe(_leaderId: string, eventType: LeaderEventType, handler: (event: any) => Promise<void>): Promise<SubscriptionHandle> {
        handlers[eventType] = handler;
        return { unsubscribe: async () => {} };
      }
    };

    const calls: string[] = [];
    const exchange: ExchangeGateway = {
      async getSubaccountInfo(subaccountId: string): Promise<SubaccountInfo> {
        if (subaccountId === "leader") {
          return { positions: [], accountValue: 10_000, marginUsed: 100, source_ref: "leader_info" };
        }
        return { positions: [], accountValue: 10_000, marginUsed: 100, source_ref: "follower_info" };
      },
      async executeIntent(intent, idempotencyKey) {
        calls.push(`${intent.market}:${idempotencyKey}`);
        return { accepted: true, source_ref: "execution" };
      }
    };

    const signer: SessionSigner = {
      provider: "privy",
      sessionId: "sess-1",
      sign: async () => "signed"
    };

    const config: CopyTradingConfig = {
      leaderId: "leader",
      followerId: "follower",
      multiplier: 2,
      sizingMode: "C1",
      maxExposureUsd: 100_000,
      perMarketCapUsd: {},
      stopLossPctByMarket: {},
      liquidationBufferPct: 0.1,
      reconcileIntervalMs: 60_000
    };

    const worker = new CopyTradingWorker(config, stream, exchange, signer);
    await worker.start();
    await handlers.position_change?.({
      type: "position_change",
      leaderId: "leader",
      market: "BTC-PERP",
      size: 1,
      side: "long",
      timestamp: Date.now(),
      source_ref: "leader:ws:position_change"
    });

    expect(calls.length).toBe(1);

    await worker.stop();
  });
});
