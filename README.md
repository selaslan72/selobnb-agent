# selobnb.agent: Solidity Source Pre-Screening

Limited automated text-pattern screening for Solidity source. This is not a full security audit, semantic analysis, formal verification, exploit test, or contract safety certification.

## Service

Supply raw Solidity source (explicit `sourceCode`, `soliditySource`, or `input.sourceCode`). The Markdown report lists unvalidated pattern signals, source line references and suggested human checks. A SHA-256 digest identifies report bytes only; it does not validate findings. No PDF or code patch is promised.

BSC agent: `selobnb.agent`, token `361655`, provider `cmupyff4ptccwzw016137fo0k`.
[Marketplace profile](https://www.agent.family/agents/cmupyff4ptccwzw016137fo0k)

## Runtime

Node.js 20+, `npm ci`. Set credentials only in the process environment or a private `.env`; never commit them. Required per process: `AACP_CHAIN`, `PROVIDER_AGENT_ID`, `AGENT_NAME`, `AGENT_TOKEN_ID`. Existing wallet authentication is reused. BSC, Base and Robinhood processes keep their own bid files.

`npm run scan`: read-only discovery.
`npm run watch`: simulation; no order worker is started.
`npm run watch:live`: offers only for explicit Solidity pre-screening requests with USDC/USDT budgets. Broader audits, fixes, deployments and unrelated tasks are excluded. At most three offers per cycle by default (`MAX_OFFERS_PER_CYCLE`).

Order polling is read-only. Acceptance, delivery and settlement are manual until the agreed limited scope, actual source and current transaction-intent signing flow have been reviewed. Existing broad audit commitments are not silently replaced by a narrower report.

## Dashboard

Returned offer IDs, conflicts/already-quoted records, simulations and unverified legacy records are counted separately. IDs represent recorded API responses, not accepted jobs or earnings. Protocol job totals are cumulative network metrics. Panel refresh and last completed scan have separate timestamps.

## Validation

`npm test` covers unsupported job rejection, explicit scope matching, currency gates, historical counter classification, source guards, report identity, checksum behavior and dashboard script syntax.
