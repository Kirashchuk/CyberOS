import type { CopyTradingConfig, PositionSnapshot } from "./types";

export type SizingInput = {
  leaderPosition: PositionSnapshot;
  config: CopyTradingConfig;
};

export function calculateTargetSize(input: SizingInput): number {
  const { leaderPosition, config } = input;

  if (config.sizingMode === "C1") {
    return leaderPosition.size * config.multiplier;
  }

  // C2 placeholder: intentionally conservative fallback until mode is implemented.
  return leaderPosition.size * config.multiplier;
}
