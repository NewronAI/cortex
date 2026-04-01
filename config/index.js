const { v4: uuidV4 } = require('uuid');

const config = {
  default: {
    user: {
      name: 'Public User',
      email: 'public@localhost',
      uuid: uuidV4(),
    },

    maxDepth: 2,
    boundToBaseUrl: true,
    headless: true,
    crawlInterval: 1000,
    maxTimeout: 30000,
    concurrency: 3,
    maxPages: 100,
    excludePatterns: [],
    outputFormats: {
      pdf: true,
      screenshot: false,
      html: false,
      markdown: false,
    },

    project: [],

    initiation: {
      date: new Date().toISOString(),
      last: new Date().toISOString(),
    },
  },
};

module.exports = config;
