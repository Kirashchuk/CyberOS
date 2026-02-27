import type { NadoEnv } from "./types";

export type NadoEndpoints = {
  gatewayHttp: string;
  archiveHttp: string;
  subscriptionsWs: string;
};

const DEFAULT_ENDPOINTS: Record<NadoEnv, NadoEndpoints> = {
  mainnet: {
    gatewayHttp: "https://api.nado.trade/gateway",
    archiveHttp: "https://api.nado.trade/archive",
    subscriptionsWs: "wss://ws.nado.trade/subscriptions"
  },
  testnet: {
    gatewayHttp: "https://api.testnet.nado.trade/gateway",
    archiveHttp: "https://api.testnet.nado.trade/archive",
    subscriptionsWs: "wss://ws.testnet.nado.trade/subscriptions"
  }
};

export function parseNadoEnv(value: string | undefined): NadoEnv {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "mainnet") {
    return "mainnet";
  }
  if (normalized === "testnet") {
    return "testnet";
  }
  throw new Error(`Invalid NADO_ENV: ${value}. Expected 'mainnet' or 'testnet'.`);
}

export function resolveNadoEnv(explicitEnv?: NadoEnv): NadoEnv {
  return explicitEnv ?? parseNadoEnv(process.env.NADO_ENV);
}

export function validateEndpointNetwork(env: NadoEnv, endpoint: string, endpointName: string): void {
  const isTestnetUrl = endpoint.includes("testnet");
  if (env === "mainnet" && isTestnetUrl) {
    throw new Error(`Endpoint '${endpointName}' is testnet but NADO_ENV is mainnet.`);
  }
  if (env === "testnet" && !isTestnetUrl) {
    throw new Error(`Endpoint '${endpointName}' must be testnet when NADO_ENV=testnet.`);
  }
}

export function resolveNadoEndpoints(env: NadoEnv, overrides?: Partial<NadoEndpoints>): NadoEndpoints {
  const resolved: NadoEndpoints = {
    ...DEFAULT_ENDPOINTS[env],
    ...overrides
  };

  validateEndpointNetwork(env, resolved.gatewayHttp, "gatewayHttp");
  validateEndpointNetwork(env, resolved.archiveHttp, "archiveHttp");
  validateEndpointNetwork(env, resolved.subscriptionsWs, "subscriptionsWs");

  return resolved;
}
