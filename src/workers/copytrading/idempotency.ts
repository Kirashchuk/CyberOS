import { createHash } from "node:crypto";
import type { OrderIntent } from "./types";

export function buildIntentIdempotencyKey(intent: OrderIntent, nonceBucketMs = 10_000): string {
  const bucket = Math.floor(Date.now() / nonceBucketMs);
  const raw = `${intent.market}|${intent.side}|${intent.targetSize}|${intent.reduceOnly ? 1 : 0}|${intent.reason}|${bucket}`;
  return createHash("sha256").update(raw).digest("hex");
}

export class IntentDeduper {
  private readonly seen = new Set<string>();

  markAndCheck(key: string): boolean {
    if (this.seen.has(key)) {
      return false;
    }
    this.seen.add(key);
    return true;
  }

  clear(): void {
    this.seen.clear();
  }
}
