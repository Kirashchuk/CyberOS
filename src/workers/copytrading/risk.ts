import type { CopyTradingConfig, OrderIntent, PositionSnapshot, SubaccountInfo } from "./types";

export type RiskDecision = {
  allowed: boolean;
  adjustedIntent?: OrderIntent;
  reason?: string;
};

function positionNotional(position: PositionSnapshot): number {
  return Math.abs(position.size) * (position.markPrice ?? 0);
}

export function applyRiskControls(
  intent: OrderIntent,
  config: CopyTradingConfig,
  account: SubaccountInfo,
  marketPrice: number
): RiskDecision {
  const totalExposure = account.positions.reduce((sum, p) => sum + positionNotional(p), 0);
  const intentNotional = Math.abs(intent.targetSize) * marketPrice;
  if (totalExposure + intentNotional > config.maxExposureUsd) {
    return { allowed: false, reason: "max_exposure_exceeded" };
  }

  const marketCap = config.perMarketCapUsd[intent.market];
  if (typeof marketCap === "number" && intentNotional > marketCap) {
    return {
      allowed: true,
      adjustedIntent: {
        ...intent,
        targetSize: Math.sign(intent.targetSize) * (marketCap / Math.max(marketPrice, 1e-9)),
        reason: "risk_guard"
      },
      reason: "per_market_cap_clamped"
    };
  }

  const stopLossPct = config.stopLossPctByMarket[intent.market];
  if (typeof stopLossPct === "number" && stopLossPct > 0) {
    const maxLossUsd = account.accountValue * stopLossPct;
    if (intentNotional > maxLossUsd) {
      return {
        allowed: false,
        reason: "custom_stop_loss_triggered"
      };
    }
  }

  const marginRatio = account.marginUsed / Math.max(account.accountValue, 1e-9);
  const marginCeiling = Math.max(0, 1 - config.liquidationBufferPct);
  if (marginRatio >= marginCeiling) {
    return {
      allowed: false,
      reason: "liquidation_prevention_guard"
    };
  }

  return { allowed: true, adjustedIntent: intent };
}
