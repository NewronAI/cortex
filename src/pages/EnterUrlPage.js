import { PaperAirplaneIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startCrawl } from '../store/slices/appDataSlice';

function EnterUrlPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savedCrawl, setSavedCrawl] = useState(null);

  useEffect(() => {
    window.electronAPI.invoke('check-saved-crawl').then(state => {
      if (state) setSavedCrawl(state);
    });
  }, []);

  function handleResumeSaved() {
    dispatch(startCrawl());
    window.electronAPI.send('resume-saved-crawl');
    navigate('/crawl');
  }

  function handleDiscardSaved() {
    window.electronAPI.send('discard-saved-crawl');
    setSavedCrawl(null);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const url = e.target.url.value.trim();

    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL including the protocol (e.g. https://)');
      return;
    }

    setError(null);
    setLoading(true);
    if (savedCrawl) {
      window.electronAPI.send('discard-saved-crawl');
      setSavedCrawl(null);
    }
    dispatch(startCrawl());
    window.electronAPI.send('crawl', url);
    navigate('/crawl');
  }

  return (
    <div className="relative py-16 sm:py-24 lg:py-32">
      <Link
        to="/settings"
        className="absolute top-4 right-4 rounded-full p-2 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Settings"
      >
        <Cog6ToothIcon className="h-5 w-5" />
      </Link>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {savedCrawl && (
            <div className="mb-6 rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-4">
              <p className="text-sm text-gray-300">
                A paused crawl was found for <strong className="text-white">{savedCrawl.baseURL}</strong>
                {' '}({savedCrawl.stats?.crawled ?? 0} pages crawled)
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={handleResumeSaved}
                  className="flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
                >
                  Resume Crawl
                </button>
                <button
                  onClick={handleDiscardSaved}
                  className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/20 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          <img alt="Newron Logo" src="newron-logo.png" width={100} className="my-2" />
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl select-none">
            Cortex by Newron.ai
          </h2>
          <p className="mt-4 text-lg leading-8 text-gray-300 select-none">
            Cortex is a web crawler that can be used to crawl websites and extract data from them.
            It is zero-config and can be used to crawl any website.
          </p>
          <form onSubmit={handleFormSubmit}>
            <div className="mt-6 flex max-w-md gap-x-4">
              <label htmlFor="address" className="sr-only">
                Enter a URL
              </label>
              <input
                id="address"
                name="url"
                type="url"
                autoComplete="url"
                required
                placeholder="https://example.com"
                className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
              />
              <button
                type="submit"
                className="flex items-center gap-3 rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? (
                  'Starting...'
                ) : (
                  <>
                    Start crawling <PaperAirplaneIcon className="h-4" />
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default EnterUrlPage;
