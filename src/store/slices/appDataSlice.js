import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentPath: null,
  links: [],
  stats: {
    total: 0,
    crawled: 0,
    skipped: 0,
    broken: 0,
    pending: 0,
    elapsed: 0,
  },
  crawlStatus: 'idle', // 'idle' | 'crawling' | 'finished' | 'failed' | 'stopped' | 'paused'
  error: null,
  outputDir: null,
  savedCrawl: null,
};

export const appDataSlice = createSlice({
  name: 'appData',
  initialState,
  reducers: {
    startCrawl(state) {
      state.crawlStatus = 'crawling';
      state.error = null;
      state.links = [];
      state.currentPath = null;
      state.outputDir = null;
      state.stats = initialState.stats;
    },
    updateProgress(state, action) {
      state.currentPath = action.payload.currentPath;
      state.links = action.payload.links;
      state.stats = action.payload.stats;
      state.crawlStatus = 'crawling';
    },
    setCrawlFinished(state, action) {
      state.crawlStatus = action.payload.aborted ? 'stopped' : 'finished';
      state.outputDir = action.payload.outputDir;
      if (action.payload.stats) {
        state.stats = action.payload.stats;
      }
    },
    setCrawlFailed(state, action) {
      state.crawlStatus = 'failed';
      state.error = action.payload;
    },
    pauseCrawl(state) {
      state.crawlStatus = 'paused';
    },
    resumeCrawl(state) {
      state.crawlStatus = 'crawling';
    },
    resetCrawl() {
      return initialState;
    },
  },
});

export const {
  startCrawl,
  updateProgress,
  setCrawlFinished,
  setCrawlFailed,
  pauseCrawl,
  resumeCrawl,
  resetCrawl,
} = appDataSlice.actions;

export default appDataSlice.reducer;
