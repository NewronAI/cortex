import { updateProgress } from '../store/slices/appDataSlice';

export const handleCrawlProgress = (dispatch) => (data) => {
  dispatch(updateProgress({
    currentPath: data.currentPath,
    links: data.links,
    stats: data.stats,
  }));
};
