import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { evaluateRequest, extractSoliditySource } from '../src/evaluator.mjs';
import { summarizeOffers } from '../src/offer-status.mjs';
import { SmartContractAuditor } from '../src/auditor.mjs';
import { renderHtml } from '../src/dashboard.mjs';
import { AutoDeliveryWorker } from '../src/worker.mjs';
import { CONFIG } from '../src/config.mjs';

const request = { title: 'Solidity source pre-screening', scope: 'A preliminary scan with pattern checks only', budget: { max: '50', currency: 'USDC' }, status: 'OPEN' };
for (const title of ['Free testnet badge mint', 'Token incentive design', 'Wallet transfer alert bot', 'KYC steps', 'README link and typo fix', 'Solidity comprehensive security audit', 'Solidity pre-screening with PDF and exploit proof']) {
  test(`reject unsupported job: ${title}`, () => assert.equal(evaluateRequest({ ...request, title, scope: '' }).eligible, false));
}
test('accept explicitly scoped screening without claiming a full audit', () => {
  const result = evaluateRequest(request);
  assert.equal(result.eligible, true);
  assert.equal(result.proposedPrice, '42.50');
  assert.doesNotMatch(result.proposal.message, /I have reviewed|exhaustive|line-by-line/);
  assert.match(result.proposal.scope, /No full audit/);
});
for (const budget of [{ max: 'NaN', currency: 'USDC' }, { max: '50', currency: 'ETH' }, { max: '50' }]) {
  test(`reject invalid budget ${JSON.stringify(budget)}`, () => assert.equal(evaluateRequest({ ...request, budget }).eligible, false));
}
test('classify conflicts and simulations without inflating submitted count', () => {
  const summary = summarizeOffers({ a: { offerId: 'offer1', simulated: false }, b: { simulated: false, status: 'ALREADY_QUOTED' }, c: { simulated: true }, d: { simulated: false }, e: { offerId: '  ' } });
  assert.deepEqual(summary.counts, { SUBMITTED: 1, ALREADY_QUOTED: 1, SIMULATED: 1, UNVERIFIED: 2 });
  assert.equal(summary.liveOffers.length, 1);
});
test('never analyze a job brief as Solidity source', async () => {
  assert.equal(extractSoliditySource({ scope: 'please audit my Solidity contract' }), null);
  await assert.rejects(new SmartContractAuditor().runAudit('please audit my contract'), /source is required/);
});
test('report uses supplied identity, line evidence, and no safety verdict', async () => {
  const auditor = new SmartContractAuditor({ identity: { name: 'selobnb.agent', tokenId: '361655', providerId: 'bsc-agent', network: 'BNB Chain', chainId: 56 } });
  const report = await auditor.runAudit('pragma solidity ^0.8.26;\ncontract Example { function f() external view returns(address) { return tx.origin; } }');
  assert.match(report.reportMarkdown, /361655/);
  assert.match(report.reportMarkdown, /Evidence lines:\*\* 2/);
  assert.doesNotMatch(report.reportMarkdown, /96678|Base network|PASSED WITH|Security Score/);
  assert.match(report.reportMarkdown, /does not prove correctness/);
  assert.equal(report.sha256Hash, crypto.createHash('sha256').update(report.reportMarkdown).digest('hex'));
});
test('no matches is not a security pass', async () => {
  const report = await new SmartContractAuditor().runAudit('pragma solidity 0.8.26; contract Empty {}');
  assert.match(report.reportMarkdown, /does not establish that the contract is safe/);
});
test('dry order monitor makes no accept or delivery request', async () => {
  const before = { walletKey: CONFIG.walletKey, providerAgentId: CONFIG.providerAgentId };
  CONFIG.walletKey = 'test-present-only'; CONFIG.providerAgentId = 'ours';
  const calls = [];
  const worker = new AutoDeliveryWorker({ authenticatedFetch: async path => { calls.push(path); return { ok: true, json: async () => ({items:[{id:'one',providerAgentId:'ours',status:'FUNDED'}]}) }; } });
  try { await worker.checkAndFulfillOrders(); assert.deepEqual(calls, ['/api/v1/orders?side=provider']); }
  finally { Object.assign(CONFIG, before); }
});
test('dashboard browser script parses and escapes remote values', () => {
  const html = renderHtml({ name: 'BNB Chain' }, 3001);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script);
  const context = { fetch: () => new Promise(() => {}), setInterval: () => {} };
  vm.createContext(context);
  vm.runInContext(script, context);
  assert.equal(vm.runInContext(`escapeHtml('<img src=x onerror="alert(1)">')`, context), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.match(html, /Network total jobs/);
  assert.match(html, /Already quoted \(conflicts\)/);
});
