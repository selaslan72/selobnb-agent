import { Wallet } from 'ethers';
import { CONFIG, getActiveNetwork } from './config.mjs';

/**
 * Autonomous Authentication Manager for TermiX AACP
 * Handles automatic SIWE/EIP nonce retrieval, signing, and 24/7 session renewal.
 */
export class AuthService {
  constructor() {
    this.network = getActiveNetwork();
    this.walletKey = CONFIG.walletKey;
    this.wallet = null;
    this.cachedToken = CONFIG.sessionToken || null;
    this.tokenExpiresAt = null;

    if (this.walletKey) {
      try {
        const cleanKey = this.walletKey.trim().replace(/^['"]|['"]$/g, '');
        this.wallet = new Wallet(cleanKey);
        console.log(`🔐 [AuthService] Auto-Login initialized for wallet: ${this.wallet.address} (${this.network.name})`);
      } catch (err) {
        console.error(`❌ [AuthService] Invalid WALLET_KEY:`, err.message);
      }
    }
  }

  /**
   * Parse JWT expiration timestamp (in ms)
   */
  getTokenExp(token) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  /**
   * Get a valid session token, auto-renewing if expired or near expiration (< 30 mins)
   */
  async getValidToken(forceRefresh = false) {
    const now = Date.now();

    if (!forceRefresh && this.cachedToken) {
      if (!this.tokenExpiresAt) {
        this.tokenExpiresAt = this.getTokenExp(this.cachedToken);
      }
      // If expires in more than 30 mins, reuse
      if (this.tokenExpiresAt && this.tokenExpiresAt - now > 30 * 60 * 1000) {
        return this.cachedToken;
      }
    }

    if (!this.wallet) {
      // Fallback to static token if no wallet private key
      return this.cachedToken;
    }

    console.log(`🔄 [AuthService] Refreshing session token for ${this.network.name}...`);
    try {
      // 1. Fetch nonce & SIWE message
      const nonceRes = await fetch(`${this.network.apiBase}/api/v1/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: this.wallet.address }),
      });

      if (!nonceRes.ok) {
        throw new Error(`Failed to fetch nonce: HTTP ${nonceRes.status}`);
      }

      const { nonce, message } = await nonceRes.json();

      // 2. Sign message with private key
      const signature = await this.wallet.signMessage(message);

      // 3. Authenticate with TermiX
      const loginRes = await fetch(`${this.network.apiBase}/api/v1/auth/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: this.wallet.address,
          nonce,
          signature,
        }),
      });

      if (!loginRes.ok) {
        const errText = await loginRes.text();
        throw new Error(`Login failed: HTTP ${loginRes.status} - ${errText}`);
      }

      const loginData = await loginRes.json();
      if (!loginData.accessToken) {
        throw new Error('No accessToken returned in login response');
      }

      this.cachedToken = loginData.accessToken;
      this.tokenExpiresAt = this.getTokenExp(this.cachedToken);
      CONFIG.sessionToken = this.cachedToken;

      console.log(`✅ [AuthService] Successfully renewed 24h session token on ${this.network.name}!`);
      return this.cachedToken;
    } catch (err) {
      console.error(`❌ [AuthService] Auto-login error on ${this.network.name}:`, err.message);
      return this.cachedToken; // Fallback to current token if renewal fails
    }
  }
}
