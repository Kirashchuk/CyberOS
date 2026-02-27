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

  const executeResults: ExecuteResult[] = [
    { ok: true, errorCode: null, source_ref: "execute#1" },
    { ok: false, errorCode: "builder_validation", source_ref: "execute#2" },
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
