# SECURITY

## Principles
- Local-first: vault is the source of truth; cloud is optional.
- Evidence-first: any extracted fact must include `source_ref`.
- Separation: repo code and vault data must never mix.
- Dry-run default: automations do not send externally without explicit policy.

## Secrets and credentials
- Store secrets in environment variables or OS keychain integrations.
- Never commit secrets to the repo or vault.
- Connector config may store non-secret identifiers only.

## Connectors
- All connectors must be explicitly enabled in vault context.
- Network actions require a policy allowlist and must log what was accessed.

## Automations and rules
- Rules must emit a deterministic execution plan before acting.
- Any external side effect must require explicit approval.

## Logging
- Logs must avoid raw secrets and redact sensitive fields.
