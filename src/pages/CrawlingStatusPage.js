import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowPathIcon,
  StopCircleIcon,
  ArrowDownTrayIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
} from '@heroicons/react/20/solid';
import {
  updateProgress,
  setCrawlFinished,
  setCrawlFailed,
  pauseCrawl,
  resumeCrawl,
  resetCrawl,
} from '../store/slices/appDataSlice';
import { Link, useNavigate } from 'react-router-dom';

function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const CrawlingStatusPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentPath = useSelector(state => state.appData.currentPath);
  const links = useSelector(state => state.appData.links);
  const stats = useSelector(state => state.appData.stats);
  const crawlStatus = useSelector(state => state.appData.crawlStatus);
  const error = useSelector(state => state.appData.error);
  const outputDir = useSelector(state => state.appData.outputDir);

  const [outputPath, setOutputPath] = useState('');

  const crawledLinks = useMemo(() => links.filter(l => l.crawled), [links]);
  const skippedLinks = useMemo(() => links.filter(l => l.skipped), [links]);
  const brokenLinks = useMemo(() => links.filter(l => l.broken), [links]);

  const isCrawling = crawlStatus === 'crawling';
  const isPaused = crawlStatus === 'paused';
  const isFinished = crawlStatus === 'finished' || crawlStatus === 'stopped';
  const isFailed = crawlStatus === 'failed';

  const progressPercent = stats.total > 0
    ? Math.round(((stats.crawled + stats.skipped) / stats.total) * 100)
    : 0;

  useEffect(() => {
    window.electronAPI.invoke('get-output-path').then(p => setOutputPath(p));
  }, []);

  useEffect(() => {
    const removers = [];

    removers.push(
      window.electronAPI.on('crawl-progress', (data) => {
        dispatch(updateProgress(data));
      })
    );

    removers.push(
      window.electronAPI.on('crawl-finished', (data) => {
        dispatch(setCrawlFinished(data));
      })
    );

    removers.push(
      window.electronAPI.on('crawl-failed', (message) => {
        dispatch(setCrawlFailed(message));
      })
    );

    removers.push(
      window.electronAPI.on('crawl-paused', () => {
        dispatch(pauseCrawl());
      })
    );

    removers.push(
      window.electronAPI.on('crawl-resumed', () => {
        dispatch(resumeCrawl());
      })
    );

    return () => {
      removers.forEach(remove => remove?.());
    };
  }, [dispatch]);

  const handleStop = useCallback(() => {
    window.electronAPI.send('stop-crawl');
  }, []);

  const handlePause = useCallback(() => {
    window.electronAPI.send('pause-crawl');
  }, []);

  const handleResume = useCallback(() => {
    window.electronAPI.send('resume-crawl');
  }, []);

  const handleNewCrawl = useCallback(() => {
    dispatch(resetCrawl());
    navigate('/');
  }, [dispatch, navigate]);

  const handleOpenFolder = useCallback(() => {
    const folder = outputDir || outputPath;
    window.electronAPI.send('open-folder', folder);
  }, [outputDir, outputPath]);

  const exportData = useCallback((format) => {
    if (links.length === 0) return;

    let content, mimeType, extension;

    if (format === 'json') {
      content = JSON.stringify(links, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const header = 'URL,Depth,Crawled,Skipped,StatusCode,Broken,Error\n';
      const rows = links.map(l =>
        `"${l.link}",${l.depth},${l.crawled},${l.skipped || false},${l.statusCode || ''},${l.broken || false},"${l.error || ''}"`
      ).join('\n');
      content = header + rows;
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crawl-results.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [links]);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-6">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {isFinished
                ? (crawlStatus === 'stopped' ? 'Crawl Stopped' : 'Crawl Complete')
                : isFailed
                  ? 'Crawl Failed'
                  : isPaused
                    ? 'Crawl Paused'
                    : 'Cortex is Crawling'}
            </h2>
            {isFailed && error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
            <p className="mt-2 text-sm leading-8 text-gray-400">
              Output: <code className="text-white">{outputDir || outputPath}</code>
              &nbsp;&nbsp;
              <button onClick={handleOpenFolder} className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                <FolderOpenIcon className="h-3.5 w-3.5" /> Open
              </button>
            </p>
          </div>

          {/* Progress bar */}
          {(isCrawling || isPaused) && (
            <div className="mt-4 mx-auto max-w-lg">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{progressPercent}% complete</span>
                <span>{formatElapsed(stats.elapsed)}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {isCrawling && (
              <>
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 rounded-md bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30 transition-colors"
                >
                  <PauseCircleIcon className="h-4 w-4" /> Pause
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 rounded-md bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <StopCircleIcon className="h-4 w-4" /> Stop Crawl
                </button>
              </>
            )}
            {isPaused && (
              <>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
                >
                  <PlayCircleIcon className="h-4 w-4" /> Resume
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 rounded-md bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  <StopCircleIcon className="h-4 w-4" /> Stop Crawl
                </button>
              </>
            )}
            {(isFinished || isFailed) && (
              <>
                <button
                  onClick={handleNewCrawl}
                  className="flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
                >
                  New Crawl
                </button>
                <button
                  onClick={() => exportData('csv')}
                  className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/20 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" /> CSV
                </button>
                <button
                  onClick={() => exportData('json')}
                  className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/20 transition-colors"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" /> JSON
                </button>
              </>
            )}
          </div>

          {/* Spinner / Paused icon */}
          {isCrawling && (
            <div className="w-full flex items-center mt-4">
              <ArrowPathIcon className="h-5 animate-spin mx-auto text-indigo-400" />
            </div>
          )}
          {isPaused && (
            <div className="w-full flex items-center mt-4">
              <PauseCircleIcon className="h-6 mx-auto text-amber-400" />
            </div>
          )}
          {isFinished && (
            <div className="w-full flex items-center mt-4">
              <CheckCircleIcon className="h-6 mx-auto text-green-400" />
            </div>
          )}
          {isFailed && (
            <div className="w-full flex items-center mt-4">
              <XCircleIcon className="h-6 mx-auto text-red-400" />
            </div>
          )}

          {/* Stats grid */}
          <dl className="mt-6 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-6">
            <div className="flex flex-col bg-white/5 p-6">
              <dt className="text-sm font-semibold leading-6 text-gray-300">Currently Crawling</dt>
              <dd className="order-first text-lg font-semibold tracking-tight text-white truncate" title={currentPath}>
                {currentPath || '—'}
              </dd>
            </div>
            <Link to="/links">
              <div className="flex flex-col bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <dt className="text-sm font-semibold leading-6 text-gray-300">Found Links</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-white">{links.length}</dd>
              </div>
            </Link>
            <Link to="/links">
              <div className="flex flex-col bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <dt className="text-sm font-semibold leading-6 text-gray-300">Crawled</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-green-400">{crawledLinks.length}</dd>
              </div>
            </Link>
            <Link to="/links">
              <div className="flex flex-col bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <dt className="text-sm font-semibold leading-6 text-gray-300">Skipped</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-amber-400">{skippedLinks.length}</dd>
              </div>
            </Link>
            <Link to="/links">
              <div className="flex flex-col bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <dt className="text-sm font-semibold leading-6 text-gray-300">Broken</dt>
                <dd className="order-first text-3xl font-semibold tracking-tight text-red-400">{brokenLinks.length}</dd>
              </div>
            </Link>
            <div className="flex flex-col bg-white/5 p-6">
              <dt className="text-sm font-semibold leading-6 text-gray-300">Elapsed</dt>
              <dd className="order-first text-3xl font-semibold tracking-tight text-white">
                {formatElapsed(stats.elapsed)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-3 flex items-center text-center w-full">
          <img alt="Newron Logo" src="newron-logo.png" width={50} className="my-2 mx-auto drop-shadow" />
        </div>
      </div>
    </div>
  );
};

export default CrawlingStatusPage;
