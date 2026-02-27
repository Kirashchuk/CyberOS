import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writeRunLog, writeStructuredRunLog } from "./logging";
import {
  CircuitBreaker,
  buildMetrics,
  createCorrelationContext,
  detectAlerts,
  isMaintenanceWindow,
  scheduleGatewayArchiveCalls,
  type ExecuteResult,
  type MaintenanceWindow
} from "./operations";
import { submitOrder } from "../trading/order_submitter";

const MAINTENANCE_WINDOWS: MaintenanceWindow[] = [
  { dayOfWeek: 0, startHourUtc: 2, endHourUtc: 4 }
];

export async function runReindex(vaultPath: string): Promise<void> {
  const indexDir = join(vaultPath, "index");
  await mkdir(indexDir, { recursive: true });
  const correlation = createCorrelationContext("reindex");

  const breaker = new CircuitBreaker(2, 60_000);
  const now = new Date();
  const pausedForMaintenance = isMaintenanceWindow(now, MAINTENANCE_WINDOWS);

  const backendPolicy = {
    builderFeeMode: "fail_closed" as const
  };

  const manualSubmit = submitOrder({
    venue: "manual_trading",
    orderFlags: 5,
    builder: "42",
    builderFeeRate: 15,
    policy: backendPolicy
  });

  const copySubmit = submitOrder({
    venue: "copy_engine",
    orderFlags: 9,
    builder: "invalid-builder-id",
    builderFeeRate: 12,
    policy: backendPolicy
  });

  const executeResults: ExecuteResult[] = [
    { ok: manualSubmit.ok, errorCode: manualSubmit.errorCode, source_ref: manualSubmit.source_ref },
    {
      ok: copySubmit.ok,
      errorCode: copySubmit.errorCode,
      source_ref: copySubmit.source_ref
    },
    { ok: false, errorCode: "gateway_timeout", source_ref: "execute#3" },
    { ok: false, errorCode: "gateway_timeout", source_ref: "execute#4" }
  ];

  if (!pausedForMaintenance && breaker.canRun(now.getTime())) {
    for (const result of executeResults) {
      if (result.ok) {
        breaker.recordSuccess();
      } else {
        breaker.recordFailure(now.getTime());
      }
    }
  }

  const schedule = scheduleGatewayArchiveCalls([
    { target: "gateway", status: 200 },
    { target: "gateway", status: 429, retryAfterMs: 1_000 },
    { target: "archive", status: 503 },
    { target: "archive", status: 200 }
  ]);

  const metrics = buildMetrics(
    executeResults,
    2,
    180,
    0.12
  );

  const alerts = detectAlerts(metrics);

  const statePath = join(indexDir, "STATE.json");
  const metricsPath = join(indexDir, "METRICS.json");
  const alertsPath = join(indexDir, "ALERTS.json");

  const state = {
    status: pausedForMaintenance ? "paused_maintenance" : "empty",
    lastReindex: new Date().toISOString(),
    notes: "Phase 0 placeholder with observability and controls",
    correlation,
    circuitBreaker: breaker.snapshot(),
    scheduler: schedule
  };

  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
  await writeFile(metricsPath, JSON.stringify(metrics, null, 2) + "\n", "utf8");
  await writeFile(alertsPath, JSON.stringify(alerts, null, 2) + "\n", "utf8");

  const structuredLogPath = await writeStructuredRunLog(vaultPath, "reindex", correlation, [
    {
      level: "info",
      event: "reindex.started",
      message: "Reindex workflow started",
      source_ref: "runReindex"
    },
    {
      level: pausedForMaintenance ? "warn" : "info",
      event: "copy_worker.status",
      message: pausedForMaintenance ? "Copy worker auto-paused due to maintenance window" : "Copy worker executed",
      source_ref: "maintenance_window",
      attributes: {
        pausedForMaintenance,
        breakerState: breaker.snapshot().state
      }
    },
    {
      level: manualSubmit.ok ? "info" : "warn",
      event: "manual_trading.submit",
      message: manualSubmit.ok ? "Manual trading order submitted" : "Manual trading order submission failed",
      source_ref: manualSubmit.source_ref,
      attributes: {
        digest: manualSubmit.audit.digest,
        appendix: manualSubmit.audit.appendix,
        builder_id: manualSubmit.audit.builder_id,
        builder_fee_rate: manualSubmit.audit.builder_fee_rate,
        builder_fee_mode: backendPolicy.builderFeeMode
      }
    },
    {
      level: copySubmit.ok ? "info" : "warn",
      event: "copy_engine.submit",
      message: copySubmit.ok ? "Copy engine order submitted" : "Copy engine order submission failed",
      source_ref: copySubmit.source_ref,
      attributes: {
        digest: copySubmit.audit.digest,
        appendix: copySubmit.audit.appendix,
        builder_id: copySubmit.audit.builder_id,
        builder_fee_rate: copySubmit.audit.builder_fee_rate,
        builder_fee_mode: backendPolicy.builderFeeMode
      }
    },
    {
      level: "info",
      event: "scheduler.backoff",
      message: "Gateway/archive schedule computed with rate-limit awareness",
      source_ref: "scheduleGatewayArchiveCalls",
      attributes: {
        retries: schedule.retries,
        totalDelayMs: schedule.totalDelayMs
      }
    },
    {
      level: alerts.length > 0 ? "warn" : "info",
      event: "alerts.evaluated",
      message: `Generated ${alerts.length} alerts`,
      source_ref: "detectAlerts",
      attributes: {
        alertCount: alerts.length
      }
    }
  ]);

  await writeRunLog(vaultPath, "reindex", "ok", [
    "Wrote index state",
    `Structured log: ${structuredLogPath}`,
    `Metrics written to ${metricsPath}`,
    `Alerts written to ${alertsPath}`
  ]);
}
