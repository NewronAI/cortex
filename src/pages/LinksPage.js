import { ChevronDoubleLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/20/solid';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

const LinksPage = ({ title, desc, backLink = true }) => {
  const links = useSelector(state => state.appData.links);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [outputPath, setOutputPath] = useState('');

  useEffect(() => {
    window.electronAPI.invoke('get-output-path').then(p => setOutputPath(p));
  }, []);

  const filteredLinks = useMemo(() => {
    let result = links;

    if (filter === 'crawled') result = result.filter(l => l.crawled);
    else if (filter === 'skipped') result = result.filter(l => l.skipped);
    else if (filter === 'pending') result = result.filter(l => !l.crawled && !l.skipped);
    else if (filter === 'broken') result = result.filter(l => l.broken);

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(l => l.link.toLowerCase().includes(term));
    }

    return result;
  }, [links, filter, search]);

  const exportData = useCallback((format) => {
    if (filteredLinks.length === 0) return;

    let content, mimeType, extension;
    if (format === 'json') {
      content = JSON.stringify(filteredLinks, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const header = 'URL,Depth,Crawled,Skipped,StatusCode,Broken,Error\n';
      const rows = filteredLinks.map(l =>
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
    a.download = `crawl-links.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLinks]);

  return (
    <div>
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-6">
        {backLink && (
          <div>
            <Link to="/crawl">
              <button className="flex gap-2 items-center justify-center text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
                <ChevronDoubleLeftIcon className="h-3" />
                Back to Crawling Status
              </button>
            </Link>
          </div>
        )}
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>
            <p className="mt-2 text-md leading-8 text-gray-300">{desc}</p>
            <p className="mt-1 text-sm leading-8 text-gray-400">
              Outputs saved in: <code className="text-white">{outputPath}</code>
            </p>
          </div>

          {/* Filter and search bar */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex rounded-md bg-white/5 p-0.5">
              {['all', 'crawled', 'skipped', 'pending', 'broken'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    filter === f
                      ? 'bg-indigo-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Search URLs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => exportData('csv')}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/20 transition-colors"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={() => exportData('json')}
              className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/20 transition-colors"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" /> JSON
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-500">{filteredLinks.length} links</p>

          {/* Links table */}
          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">
                        URL
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                        Depth
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredLinks.map((link, i) => (
                      <tr key={link.link + '-' + i}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0 max-w-md truncate" title={link.link}>
                          {link.link}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {link.broken ? (
                            <span className="inline-flex items-center rounded-full bg-red-400/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-400/20">
                              {link.statusCode || 'Error'}
                            </span>
                          ) : link.crawled ? (
                            <span className="inline-flex items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-400/20">
                              {link.statusCode || 'OK'}
                            </span>
                          ) : link.skipped ? (
                            <span className="inline-flex items-center rounded-full bg-amber-400/10 px-2 py-1 text-xs font-medium text-amber-400 ring-1 ring-inset ring-amber-400/20" title={link.error || ''}>
                              Skipped
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-400/10 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-400/20">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                          {link.depth}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center text-center w-full">
          <img alt="Newron Logo" src="newron-logo.png" width={50} className="my-2 mx-auto drop-shadow" />
        </div>
      </div>
    </div>
  );
};

export default LinksPage;
