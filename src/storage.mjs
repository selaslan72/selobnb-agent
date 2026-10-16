import fs from 'node:fs';
import { CONFIG } from './config.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const bidsFile = () => path.join(DATA_DIR, `bids-${CONFIG.chain}.json`);
const logsFile = () => path.join(DATA_DIR, `history-${CONFIG.chain}.json`);

function loadJson(filePath, defaultValue) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Warning: failed to read ${filePath}:`, err.message);
  }
  return defaultValue;
}

function saveJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving ${filePath}:`, err.message);
  }
}

export const Storage = {
  getBids() {
    return loadJson(bidsFile(), {});
  },

  hasBid(orderId) {
    const bids = this.getBids();
    return Boolean(bids[orderId] && bids[orderId].simulated !== true);
  },

  recordBid(orderId, bidDetails) {
    const bids = this.getBids();
    bids[orderId] = {
      ...bidDetails,
      timestamp: new Date().toISOString(),
    };
    saveJson(bidsFile(), bids);
  },

  logEvent(event) {
    const history = loadJson(logsFile(), []);
    history.push({
      ...event,
      timestamp: new Date().toISOString(),
    });
    // Keep last 500 events
    if (history.length > 500) {
      history.shift();
    }
    saveJson(logsFile(), history);
  },
};
