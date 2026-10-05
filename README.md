# selobnb.agent — Autonomous Web3 Security & Audit Agent

[![BNB Chain](https://img.shields.io/badge/Network-BNB%20Smart%20Chain-F0B90B?logo=binance)](https://bscscan.com)
[![ERC-8004](https://img.shields.io/badge/Standard-ERC--8004-blue)](https://8004scan.io)
[![Marketplace](https://img.shields.io/badge/TermiX-Listed%20%26%20Active-00FFAA)](https://www.agent.family/bsc/agent/cmupyff4ptccwzw016137fo0k)
[![BNB Chain Campaign](https://img.shields.io/badge/BNB%20Chain-Set%20and%20Earn-gold)](https://www.bnbchain.org/en/hackathons/smart-money-era-set-and-earn)

An autonomous AI agent engineered for **BNB Smart Chain (BSC)** that monitors decentralized tasks, performs algorithmic smart contract security audits, and autonomously executes verifiable deliverables with on-chain cryptographic proofs.

---

## 📋 Official ERC-8004 Agent Identity

- **Agent Name:** `selobnb.agent`
- **ERC-8004 Token ID / Registry ID:** `361655`
- **Network:** BNB Smart Chain (Mainnet, Chain ID: `56`)
- **ERC-8004 Identity Registry Contract:** [`0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`](https://bscscan.com/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
- **Agent Owner Address:** `0x26c6be753ae99d6982aa06ae40c325dfe65e9edf`
- **Marketplace Profile:** [TermiX AACP — selobnb.agent](https://www.agent.family/bsc/agent/cmupyff4ptccwzw016137fo0k)
- **Active Service Listing:** *Autonomous BEP-20 & Solidity Smart Contract Security Audit*

---

## 🛠️ Core Capabilities

`selobnb.agent` specializes in high-assurance automated code analysis for smart contracts and decentralized protocols deployed on BNB Chain:

1. **Vulnerability Detection:**
   - Reentrancy vectors (single-function, cross-function, cross-contract).
   - Access control bypasses & uninitialized proxy implementations.
   - Flash loan attack surface & oracle price manipulation checks.
   - Unchecked low-level calls and silent transfer failures in BEP-20 tokens.
2. **Gas Optimization:**
   - Storage layout audits, custom errors vs string reverts, calldata optimization.
3. **Verifiable Delivery:**
   - Generates structured Markdown and JSON audit reports.
   - Computes SHA-256 cryptographic hashes for deliverable validation on-chain through TermiX AACP escrow.

---

## 🚀 Architecture & Autonomous Lifecycle

```
[ TermiX AACP Marketplace (BSC) ]
              │
              ▼ (Every 15s Radar Scan)
     [ Proactive Bidder ]
              │
              ▼ (15% Competitive Discount Offer)
      [ Escrow Funded ]
              │
              ▼
   [ AutoDeliveryWorker ] ──► Static & Semantic Analyzer ──► Vulnerability Scanner
              │
              ▼
  [ On-Chain Settlement ] ◄── Cryptographic Proof & Executive Audit Report
```

- **Autonomous Authentication:** Uses EIP-712 / SIWE (Sign-In with Ethereum) nonce verification for daily self-renewing sessions.
- **Autonomous Fulfillment:** Listens for funded escrow events and generates audit artifacts without human intervention.

---

## 📦 Project Setup & Local Run

### Prerequisites
- Node.js >= 20.x
- npm

### Installation
```bash
git clone https://github.com/<your-username>/selobnb-agent.git
cd selobnb-agent
npm install
```

### Environment Configuration
Create a `.env` file (never commit to git):
```env
AACP_CHAIN=bsc
PROVIDER_AGENT_ID=cmupyff4ptccwzw016137fo0k
WALLET_KEY=0x<your_private_key>
MIN_BUDGET_USD=20.0
BID_DISCOUNT_RATE=0.85
POLL_INTERVAL_SEC=15
```

### Run
```bash
# Scan mode (Inspect current open requests)
npm run scan

# Autonomous daemon watch mode
npm run watch:live
```

---

## 🏆 BNB Chain: Set and Earn Campaign Compliance

This repository satisfies the **Build & List an Agent** criteria for the [BNB Chain: Set and Earn Hackathon](https://www.bnbchain.org/en/hackathons/smart-money-era-set-and-earn):
- [x] Owned by registered campaign wallet (`0x26c6be753ae99d6982aa06ae40c325dfe65e9edf`)
- [x] Registered under ERC-8004 standard on BNB Smart Chain Mainnet (Token ID `361655`)
- [x] Listed on a shortlisted official marketplace (TermiX AACP)
- [x] Public source repository detailing agent purpose, category, and identity registry ID.
- [x] 24/7 responsive autonomous delivery worker.

---

## 📄 License
MIT License.
