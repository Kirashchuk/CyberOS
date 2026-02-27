import { randomUUID } from "node:crypto";

export type CorrelationContext = {
  requestId: string;
  instanceId: string;
  intentId: string;
  digest: string;
};

export type StructuredLog = {
  timestamp: string;
  level: "info" | "warn" | "error";
  event: string;
  message: string;
  correlation: CorrelationContext;
  source_ref: string;
  attributes?: Record<string, string | number | boolean | null>;
};

export type ExecuteResult = {
  ok: boolean;
  errorCode: string | null;
  source_ref: string;
};

export type ReindexMetrics = {
  wsReconnectCount: number;
  subscriptionLagMs: number;
  copyDrift: number;
  execute: {
    success: number;
    failByErrorCode: Record<string, number>;
  };
};

export type Alert = {
  severity: "warning" | "critical";
  code: "error_burst" | "drift_threshold" | "builder_validation_failures";
  message: string;
  source_ref: string;
};

export type MaintenanceWindow = {
  dayOfWeek: number;
  startHourUtc: number;
  endHourUtc: number;
};

export class CircuitBreaker {
  private failureCount = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private openedAtMs = 0;

  constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number
  ) {}

  public canRun(nowMs: number): boolean {
    if (this.state === "closed") {
      return true;
    }

    if (this.state === "open") {
      if (nowMs - this.openedAtMs >= this.cooldownMs) {
        this.state = "half-open";
        return true;
      }
      return false;
    }

    return true;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
    this.openedAtMs = 0;
  }

  public recordFailure(nowMs: number): void {
    this.failureCount += 1;
    if (this.failureCount >= this.failureThreshold) {
      this.state = "open";
      this.openedAtMs = nowMs;
    }
  }

  public snapshot(): { state: "closed" | "open" | "half-open"; failureCount: number } {
    return { state: this.state, failureCount: this.failureCount };
  }
}

export function isMaintenanceWindow(now: Date, windows: MaintenanceWindow[]): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  return windows.some((window) => {
    if (window.dayOfWeek !== day) {
      return false;
    }
    return hour >= window.startHourUtc && hour < window.endHourUtc;
  });
}

export function computeBackoffMs(attempt: number, retryAfterMs?: number): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return retryAfterMs;
  }
  const base = 250;
  const cappedAttempt = Math.min(attempt, 6);
  const exp = base * 2 ** cappedAttempt;
  const jitter = Math.floor(exp * 0.2);
  return exp + jitter;
}

export function scheduleGatewayArchiveCalls(
  responses: Array<{ target: "gateway" | "archive"; status: number; retryAfterMs?: number }>
): { totalDelayMs: number; retries: number } {
  let totalDelayMs = 0;
  let retries = 0;

  responses.forEach((response, index) => {
    if (response.status === 429 || response.status >= 500) {
      retries += 1;
      totalDelayMs += computeBackoffMs(index + 1, response.retryAfterMs);
    }
  });

  return { totalDelayMs, retries };
}

export function buildMetrics(executeResults: ExecuteResult[], wsReconnectCount: number, subscriptionLagMs: number, copyDrift: number): ReindexMetrics {
  const failByErrorCode: Record<string, number> = {};
  let success = 0;

  for (const result of executeResults) {
    if (result.ok) {
      success += 1;
      continue;
    }

    const key = result.errorCode ?? "unknown";
    failByErrorCode[key] = (failByErrorCode[key] ?? 0) + 1;
  }

  return {
    wsReconnectCount,
    subscriptionLagMs,
    copyDrift,
    execute: {
      success,
      failByErrorCode
    }
  };
}

export function detectAlerts(metrics: ReindexMetrics): Alert[] {
  const alerts: Alert[] = [];
  const totalFailures = Object.values(metrics.execute.failByErrorCode).reduce((sum, value) => sum + value, 0);

  if (totalFailures >= 3) {
    alerts.push({
      severity: "critical",
      code: "error_burst",
      message: `Execute failures burst detected: ${totalFailures}`,
      source_ref: "metrics.execute.failByErrorCode"
    });
  }

  if (metrics.copyDrift > 0.1) {
    alerts.push({
      severity: "warning",
      code: "drift_threshold",
      message: `Copy drift above threshold: ${metrics.copyDrift.toFixed(3)}`,
      source_ref: "metrics.copyDrift"
    });
  }

  if ((metrics.execute.failByErrorCode.builder_validation ?? 0) > 0 || (metrics.execute.failByErrorCode.InvalidBuilder ?? 0) > 0) {
    alerts.push({
      severity: "critical",
      code: "builder_validation_failures",
      message: "Builder validation failures detected in execute stage",
      source_ref: "metrics.execute.failByErrorCode.InvalidBuilder"
    });
  }

  return alerts;
}

export function createCorrelationContext(command: string): CorrelationContext {
  return {
    requestId: randomUUID(),
    instanceId: `cyberos-${process.pid}`,
    intentId: `${command}-${Date.now()}`,
    digest: randomUUID().slice(0, 12)
  };
}
