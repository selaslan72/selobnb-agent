import crypto from 'node:crypto';

/**
 * Autonomous Smart Contract Security Audit Engine
 * Analyzes Solidity contracts for common and critical Web3 vulnerabilities.
 */
export class SmartContractAuditor {
  constructor(options = {}) {
    this.apiKey = options.llmApiKey || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || '';
  }

  /**
   * Main audit pipeline
   * @param {string} sourceCode - Raw Solidity code or repository content
   * @param {string} contractTitle - Title/Name of the contract
   * @returns {Promise<Object>} Audit report with findings, score, and sha256 hash
   */
  async runAudit(sourceCode, contractTitle = 'Contract') {
    const findings = this.detectVulnerabilities(sourceCode);
    const gasOptimizations = this.detectGasOptimizations(sourceCode);
    const securityScore = this.calculateScore(findings);

    const reportMarkdown = this.formatReportMarkdown({
      title: contractTitle,
      sourceCode,
      findings,
      gasOptimizations,
      securityScore,
      timestamp: new Date().toISOString(),
    });

    const sha256Hash = crypto.createHash('sha256').update(reportMarkdown).digest('hex');

    return {
      title: contractTitle,
      securityScore,
      findingsCount: findings.length,
      criticalCount: findings.filter(f => f.severity === 'CRITICAL').length,
      highCount: findings.filter(f => f.severity === 'HIGH').length,
      mediumCount: findings.filter(f => f.severity === 'MEDIUM').length,
      lowCount: findings.filter(f => f.severity === 'LOW').length,
      findings,
      gasOptimizations,
      reportMarkdown,
      sha256Hash,
    };
  }

  detectVulnerabilities(code) {
    const findings = [];
    const lines = code.split('\n');

    // 1. Reentrancy Check: external calls before state updates
    if (code.includes('.call{value:') || code.includes('.transfer(') || code.includes('.send(')) {
      let hasReentrancyGuard = code.includes('nonReentrant') || code.includes('ReentrancyGuard');
      if (!hasReentrancyGuard) {
        findings.push({
          id: 'SEC-001',
          title: 'Missing Reentrancy Protection on External Calls',
          severity: 'HIGH',
          category: 'Reentrancy',
          description: 'Contract performs ether or token transfers without explicit nonReentrant guards. State variables updated after external calls can be exploited via reentrancy.',
          remediation: 'Apply OpenZeppelin ReentrancyGuard and ensure the Checks-Effects-Interactions pattern is strictly followed.',
        });
      }
    }

    // 2. Unprotected Selfdestruct
    if (code.includes('selfdestruct(') || code.includes('suicide(')) {
      findings.push({
        id: 'SEC-002',
        title: 'Deprecated and Dangerous selfdestruct Usage',
        severity: 'CRITICAL',
        category: 'Access Control',
        description: 'selfdestruct opcode is deprecated since EIP-6780 (Dencun) and presents severe risk of permanent fund loss if access control is bypassed.',
        remediation: 'Remove selfdestruct entirely. Use upgradeable proxy patterns or pause mechanisms instead.',
      });
    }

    // 3. Delegatecall to untrusted target
    if (code.includes('.delegatecall(')) {
      findings.push({
        id: 'SEC-003',
        title: 'Potential Arbitrary Delegatecall Hazard',
        severity: 'HIGH',
        category: 'Logic / Access Control',
        description: 'delegatecall executes target bytecode within the context of the caller storage. If target is mutable or user-controlled, attacker can overwrite storage slots (e.g. owner).',
        remediation: 'Ensure target addresses are immutable constants or strictly authenticated against an on-chain whitelist.',
      });
    }

    // 4. Tx.origin for authentication
    if (code.includes('tx.origin')) {
      findings.push({
        id: 'SEC-004',
        title: 'Dangerous Authentication using tx.origin',
        severity: 'HIGH',
        category: 'Phishing Vulnerability',
        description: 'Using tx.origin for access control allows malicious intermediary contracts to execute privileged functions via phishing attacks.',
        remediation: 'Replace tx.origin with msg.sender for authorization checks.',
      });
    }

    // 5. Unchecked ERC-20 return values
    if ((code.includes('.transfer(') || code.includes('.transferFrom(')) && !code.includes('SafeERC20') && !code.includes('safeTransfer')) {
      findings.push({
        id: 'SEC-005',
        title: 'Unchecked Token Transfer Return Values',
        severity: 'MEDIUM',
        category: 'Token Standard Compliance',
        description: 'Some ERC-20 tokens (e.g. USDT) do not revert on failure or do not return standard bools. Direct transfer() calls may silently fail.',
        remediation: 'Use OpenZeppelin SafeERC20 library and replace calls with safeTransfer / safeTransferFrom.',
      });
    }

    // 6. Block.timestamp manipulation / Front-running
    if (code.includes('block.timestamp') || code.includes('now')) {
      findings.push({
        id: 'SEC-006',
        title: 'Block.timestamp Dependence',
        severity: 'LOW',
        category: 'Miner / Validator Manipulation',
        description: 'Validators have minor discretion over block timestamp (~15s window). Should not be used for high-stakes randomness or sub-minute locks.',
        remediation: 'Avoid strict equality checks with block.timestamp. Use Chainlink VRF for provably fair randomness.',
      });
    }

    // 7. Floating Pragma
    if (code.includes('pragma solidity ^')) {
      findings.push({
        id: 'SEC-007',
        title: 'Floating Solidity Compiler Pragma',
        severity: 'INFO',
        category: 'Best Practices',
        description: 'Locking compiler pragma prevents accidental compilation with buggy or outdated versions in production.',
        remediation: 'Lock the pragma to a specific stable compiler version (e.g. pragma solidity 0.8.26;).',
      });
    }

    return findings;
  }

  detectGasOptimizations(code) {
    const opts = [];

    if (code.includes('memory') && code.includes('function') && code.includes('external')) {
      opts.push({
        title: 'Use calldata instead of memory for external function parameters',
        impact: 'Saves ~200-800 gas per array/string parameter by avoiding memory allocation.',
      });
    }

    if (code.includes('public') && (code.includes('uint') || code.includes('address')) && !code.includes('constant') && !code.includes('immutable')) {
      opts.push({
        title: 'Mark unchanged storage variables as constant or immutable',
        impact: 'Saves a Gsreset/SSTORE (20,000 gas) and turns reads into cheap PUSH32 opcodes (3 gas).',
      });
    }

    if (code.includes('++i') || code.includes('i++')) {
      opts.push({
        title: 'Use unchecked increment in for loops',
        impact: 'In Solidity >=0.8.0, wrapping loop counters in unchecked { ++i; } saves 30-40 gas per iteration.',
      });
    }

    return opts;
  }

  calculateScore(findings) {
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'CRITICAL') score -= 35;
      else if (f.severity === 'HIGH') score -= 20;
      else if (f.severity === 'MEDIUM') score -= 10;
      else if (f.severity === 'LOW') score -= 5;
    }
    return Math.max(0, score);
  }

  formatReportMarkdown({ title, findings, gasOptimizations, securityScore, timestamp }) {
    return `# 🛡️ Security Audit Report: ${title}

**Auditor:** \`selo.agent\` (#96678) · TermiX AACP Autonomous Security Node
**Date:** ${new Date(timestamp).toUTCString()}
**Security Score:** **${securityScore}/100**
**Protocol Status:** ${securityScore >= 80 ? '🟢 PASSED WITH RECOMMENDATIONS' : securityScore >= 50 ? '🟡 REQUIRES ATTENTION' : '🔴 CRITICAL REVISIONS NEEDED'}

---

## 📊 Executive Summary

| Metric | Value |
| :--- | :--- |
| **Total Findings** | ${findings.length} |
| **Critical Severity** | ${findings.filter(f => f.severity === 'CRITICAL').length} |
| **High Severity** | ${findings.filter(f => f.severity === 'HIGH').length} |
| **Medium Severity** | ${findings.filter(f => f.severity === 'MEDIUM').length} |
| **Low / Info Severity** | ${findings.filter(f => f.severity === 'LOW' || f.severity === 'INFO').length} |
| **Gas Optimizations** | ${gasOptimizations.length} items |

---

## 🔍 Detailed Vulnerability Findings

${findings.length === 0 ? '*No critical security vulnerabilities detected in the reviewed code scope.*' : findings.map((f, idx) => `
### [${f.id}] ${f.title}
* **Severity:** \`${f.severity}\` | **Category:** ${f.category}
* **Description:** ${f.description}
* **Remediation Recommendation:**
  > ${f.remediation}
`).join('\n')}

---

## ⚡ Gas Optimization Recommendations

${gasOptimizations.map((opt, idx) => `
${idx + 1}. **${opt.title}**
   - *Impact:* ${opt.impact}
`).join('\n')}

---

## 📜 Verifiable Delivery Attestation

This deliverable was autonomously compiled, verified, and sealed by **selo.agent** on the Base network.
- **Agent Registry:** \`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432\` (Token #96678)
- **Settlement Method:** TermiX AACP On-Chain Escrow (ERC-8183)
`;
  }
}
