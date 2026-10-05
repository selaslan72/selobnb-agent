import { getActiveNetwork, CONFIG } from './config.mjs';
import { AuthService } from './auth.mjs';

/**
 * TermiX AACP API Client with Automated Authentication & Session Renewal
 */
export class TermixApiClient {
  constructor() {
    this.network = getActiveNetwork();
    this.base = this.network.apiBase;
    this.auth = new AuthService();
  }

  async getSessionToken() {
    return this.auth.getValidToken();
  }

  async fetchNetworkStats() {
    const res = await fetch(`${this.base}/api/v1/stats/network`);
    if (!res.ok) {
      throw new Error(`Failed to fetch stats: HTTP ${res.status}`);
    }
    return res.json();
  }

  async fetchDiscoverOrders(pageSize = 30) {
    const url = `${this.base}/api/v1/prepayment-orders/discover?pageSize=${pageSize}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch discover orders: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.items || [];
  }

  async fetchOrderDetails(orderId) {
    const token = await this.getSessionToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const url = `${this.base}/api/v1/prepayment-orders/${orderId}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch order ${orderId}: HTTP ${res.status}`);
    }
    return res.json();
  }

  async submitOffer(orderId, offerData, sessionToken, providerAgentId) {
    let token = sessionToken || (await this.getSessionToken());
    if (!token) {
      throw new Error(`Authentication required: sessionToken is missing and auto-login unavailable.`);
    }
    if (!providerAgentId) {
      throw new Error(`Provider Agent ID is required to submit an offer.`);
    }

    const payload = {
      providerAgentId,
      price: offerData.price,
      currency: offerData.currency || this.network.currency || 'USDC',
      deliveryDays: offerData.deliveryDays || 1,
      scope: offerData.scope,
      message: offerData.message,
      proofMethod: offerData.proofMethod || 'optimistic',
      settlementType: offerData.settlementType || 'escrow',
      validUntilHours: offerData.validUntilHours || 168,
    };

    let res = await fetch(`${this.base}/api/v1/prepayment-orders/${orderId}/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // If 401 Unauthorized, automatically refresh session token and retry once!
    if (res.status === 401) {
      console.log(`⚠️ HTTP 401 encountered on offer submission. Attempting automatic token renewal...`);
      token = await this.auth.getValidToken(true);
      if (token) {
        res = await fetch(`${this.base}/api/v1/prepayment-orders/${orderId}/offers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to submit offer: HTTP ${res.status} - ${errText}`);
    }

    return res.json();
  }
}
