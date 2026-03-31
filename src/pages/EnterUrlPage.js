import { PaperAirplaneIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useDispatch } from 'react-redux';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { startCrawl } from '../store/slices/appDataSlice';

function EnterUrlPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    dispatch(startCrawl());
    window.electronAPI.send('crawl', url);
    navigate('/crawl');
  }

  return (
    <div className="py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between">
            <div>
              <img alt="Newron Logo" src="newron-logo.png" width={100} className="my-2" />
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              Settings
            </Link>
          </div>
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
