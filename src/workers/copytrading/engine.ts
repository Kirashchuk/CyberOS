import { buildIntentIdempotencyKey, IntentDeduper } from "./idempotency";
import { applyRiskControls } from "./risk";
import { calculateTargetSize } from "./sizing";
import { CopyTradingStateMachine } from "./stateMachine";
import type {
  CopyTradingConfig,
  ExchangeGateway,
  LeaderEvent,
  LeaderStream,
  OrderIntent,
  PositionSnapshot,
  SessionSigner,
  SubscriptionHandle
} from "./types";

export class CopyTradingWorker {
  readonly machine = new CopyTradingStateMachine();

  private reconcileTimer: ReturnType<typeof setInterval> | null = null;
  private readonly subscriptions: SubscriptionHandle[] = [];
  private readonly deduper = new IntentDeduper();

  constructor(
    private readonly config: CopyTradingConfig,
    private readonly stream: LeaderStream,
    private readonly exchange: ExchangeGateway,
    private readonly sessionSigner: SessionSigner
  ) {}

  async start(): Promise<void> {
    try {
      await this.subscribeLeaderEvents();
      this.startReconcileLoop();
      this.machine.start();
    } catch (error) {
      this.machine.fail(error instanceof Error ? error.message : "start_failed");
      throw error;
    }
  }

  pause(): void {
    this.machine.pause();
  }

  resume(): void {
    this.machine.resume();
  }

  async stop(): Promise<void> {
    this.machine.stop();
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }
    while (this.subscriptions.length > 0) {
      const next = this.subscriptions.pop();
      if (next) {
        await next.unsubscribe();
      }
    }
    this.deduper.clear();
  }

  getClientConfig(): CopyTradingConfig {
    return this.config;
  }

  private async subscribeLeaderEvents(): Promise<void> {
    const onEvent = async (event: LeaderEvent): Promise<void> => {
      if (this.machine.current !== "running") {
        return;
      }
      await this.handleLeaderEvent(event);
    };

    this.subscriptions.push(
      await this.stream.subscribe(this.config.leaderId, "position_change", onEvent),
      await this.stream.subscribe(this.config.leaderId, "fill", onEvent)
    );
  }

  private startReconcileLoop(): void {
    this.reconcileTimer = setInterval(() => {
      if (this.machine.current !== "running") {
        return;
      }
      void this.reconcileFromSubaccountInfo();
    }, this.config.reconcileIntervalMs);
  }

  private async reconcileFromSubaccountInfo(): Promise<void> {
    const leader = await this.exchange.getSubaccountInfo(this.config.leaderId);
    for (const position of leader.positions) {
      await this.syncPosition(position, "reconcile", leader.source_ref);
    }
  }

  private async handleLeaderEvent(event: LeaderEvent): Promise<void> {
    const snapshot: PositionSnapshot = {
      market: event.market,
      size: event.size,
      side: event.side,
      markPrice: event.fillPrice
    };
    await this.syncPosition(snapshot, "event", event.source_ref);
  }

  private async syncPosition(position: PositionSnapshot, reason: OrderIntent["reason"], source_ref: string): Promise<void> {
    const account = await this.exchange.getSubaccountInfo(this.config.followerId);
    const targetSize = calculateTargetSize({
      leaderPosition: position,
      config: this.config
    });

    const intent: OrderIntent = {
      market: position.market,
      side: position.side,
      targetSize,
      reason,
      source_ref
    };

    const marketPrice = position.markPrice ?? 0;
    const risk = applyRiskControls(intent, this.config, account, marketPrice);
    if (!risk.allowed || !risk.adjustedIntent) {
      return;
    }

    const idempotencyKey = buildIntentIdempotencyKey(risk.adjustedIntent);
    if (!this.deduper.markAndCheck(idempotencyKey)) {
      return;
    }

    const signedPayload = await this.sessionSigner.sign(JSON.stringify({
      intent: risk.adjustedIntent,
      idempotencyKey
    }));

    await this.exchange.executeIntent(
      {
        ...risk.adjustedIntent,
        source_ref: `${source_ref}|signed_by:${this.sessionSigner.provider}|session:${this.sessionSigner.sessionId}|sig:${signedPayload.slice(0, 12)}`
      },
      idempotencyKey
    );
  }
}
