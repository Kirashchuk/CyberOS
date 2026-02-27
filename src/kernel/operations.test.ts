import { describe, expect, test } from "bun:test";
import {
  CircuitBreaker,
  buildMetrics,
  computeBackoffMs,
  detectAlerts,
  isMaintenanceWindow,
  scheduleGatewayArchiveCalls
} from "./operations";

describe("CircuitBreaker", () => {
  test("opens after failure threshold and recovers after cooldown", () => {
    const breaker = new CircuitBreaker(2, 1_000);
    const now = 1000;

    expect(breaker.canRun(now)).toBe(true);
    breaker.recordFailure(now);
    breaker.recordFailure(now);

    expect(breaker.snapshot().state).toBe("open");
    expect(breaker.canRun(now + 500)).toBe(false);
    expect(breaker.canRun(now + 1000)).toBe(true);

    breaker.recordSuccess();
    expect(breaker.snapshot().state).toBe("closed");
  });
});

describe("scheduler", () => {
  test("applies retry-after for throttled requests", () => {
    const schedule = scheduleGatewayArchiveCalls([
      { target: "gateway", status: 429, retryAfterMs: 900 },
      { target: "archive", status: 503 }
    ]);

    expect(schedule.retries).toBe(2);
    expect(schedule.totalDelayMs).toBeGreaterThan(900);
  });

  test("computes exponential backoff with jitter", () => {
    expect(computeBackoffMs(1)).toBeGreaterThan(500);
  });
});

describe("metrics and alerts", () => {
  test("builds execute success/failure and emits alert thresholds", () => {
    const metrics = buildMetrics(
      [
        { ok: true, errorCode: null, source_ref: "x" },
        { ok: false, errorCode: "builder_validation", source_ref: "x" },
        { ok: false, errorCode: "gateway_timeout", source_ref: "x" },
        { ok: false, errorCode: "gateway_timeout", source_ref: "x" }
      ],
      3,
      100,
      0.2
    );

    expect(metrics.execute.success).toBe(1);
    expect(metrics.execute.failByErrorCode.gateway_timeout).toBe(2);

    const alerts = detectAlerts(metrics);
    expect(alerts.some((item) => item.code === "error_burst")).toBe(true);
    expect(alerts.some((item) => item.code === "builder_validation_failures")).toBe(true);
    expect(alerts.some((item) => item.code === "drift_threshold")).toBe(true);
  });

  test("detects maintenance windows in UTC", () => {
    const inside = isMaintenanceWindow(new Date("2026-01-04T02:30:00Z"), [
      { dayOfWeek: 0, startHourUtc: 2, endHourUtc: 4 }
    ]);
    const outside = isMaintenanceWindow(new Date("2026-01-04T05:30:00Z"), [
      { dayOfWeek: 0, startHourUtc: 2, endHourUtc: 4 }
    ]);

    expect(inside).toBe(true);
    expect(outside).toBe(false);
  });
});
