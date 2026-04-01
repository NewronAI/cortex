const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_PATH = path.resolve(os.homedir(), 'cortex', 'crawl-state.json');

class CrawlStateManager {
  save(state) {
    const dir = path.dirname(STATE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = STATE_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, STATE_PATH);
  }

  load() {
    try {
      if (!fs.existsSync(STATE_PATH)) return null;
      const data = fs.readFileSync(STATE_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  exists() {
    return fs.existsSync(STATE_PATH);
  }

  delete() {
    try {
      if (fs.existsSync(STATE_PATH)) {
        fs.unlinkSync(STATE_PATH);
      }
    } catch {
      // ignore
    }
  }
}

module.exports = CrawlStateManager;
