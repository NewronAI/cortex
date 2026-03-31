import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDoubleLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/20/solid';

const SettingsPage = () => {
  const [config, setConfig] = useState(null);
  const [saved, setSaved] = useState(false);
  const [newPattern, setNewPattern] = useState('');

  useEffect(() => {
    window.electronAPI.send('get-config');
    const remove = window.electronAPI.on('config-data', (data) => {
      setConfig(data);
    });
    return () => remove?.();
  }, []);

  const handleSave = useCallback(() => {
    if (!config) return;
    window.electronAPI.send('save-config', config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [config]);

  const updateField = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  }, []);

  const addPattern = useCallback(() => {
    const trimmed = newPattern.trim();
    if (!trimmed) return;
    setConfig(prev => ({
      ...prev,
      excludePatterns: [...(prev.excludePatterns || []), trimmed],
    }));
    setNewPattern('');
  }, [newPattern]);

  const removePattern = useCallback((index) => {
    setConfig(prev => ({
      ...prev,
      excludePatterns: prev.excludePatterns.filter((_, i) => i !== index),
    }));
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <span className="text-gray-400">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 mt-6 pb-8">
      <Link to="/">
        <button className="flex gap-2 items-center justify-center text-zinc-500 text-sm hover:text-zinc-300 transition-colors mb-4">
          <ChevronDoubleLeftIcon className="h-3" />
          Back to Home
        </button>
      </Link>

      <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
      <p className="mt-1 text-sm text-gray-400">Configure crawl behavior. Changes apply to the next crawl.</p>

      <div className="mt-6 space-y-6">
        {/* Crawl Depth */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Max Crawl Depth</label>
          <p className="text-xs text-gray-500 mt-0.5">How many levels deep to follow links (1 = only the starting page's links)</p>
          <input
            type="number"
            min={1}
            max={10}
            value={config.maxDepth}
            onChange={(e) => updateField('maxDepth', parseInt(e.target.value) || 1)}
            className="mt-1 w-24 rounded-md border-0 bg-white/5 px-3 py-1.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Concurrency */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Concurrency</label>
          <p className="text-xs text-gray-500 mt-0.5">Number of pages to crawl simultaneously</p>
          <input
            type="number"
            min={1}
            max={10}
            value={config.concurrency ?? 3}
            onChange={(e) => updateField('concurrency', parseInt(e.target.value) || 1)}
            className="mt-1 w-24 rounded-md border-0 bg-white/5 px-3 py-1.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Max Pages */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Max Pages</label>
          <p className="text-xs text-gray-500 mt-0.5">Maximum number of pages to crawl before stopping</p>
          <input
            type="number"
            min={1}
            max={10000}
            value={config.maxPages ?? 100}
            onChange={(e) => updateField('maxPages', parseInt(e.target.value) || 100)}
            className="mt-1 w-32 rounded-md border-0 bg-white/5 px-3 py-1.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Crawl Interval */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Crawl Interval (ms)</label>
          <p className="text-xs text-gray-500 mt-0.5">Delay between page crawls to be polite to servers</p>
          <input
            type="number"
            min={0}
            max={10000}
            step={100}
            value={config.crawlInterval}
            onChange={(e) => updateField('crawlInterval', parseInt(e.target.value) || 0)}
            className="mt-1 w-32 rounded-md border-0 bg-white/5 px-3 py-1.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Page Timeout */}
        <div>
          <label className="block text-sm font-medium text-gray-300">Page Timeout (ms)</label>
          <p className="text-xs text-gray-500 mt-0.5">Maximum time to wait for a page to load</p>
          <input
            type="number"
            min={5000}
            max={120000}
            step={1000}
            value={config.maxTimeout}
            onChange={(e) => updateField('maxTimeout', parseInt(e.target.value) || 30000)}
            className="mt-1 w-32 rounded-md border-0 bg-white/5 px-3 py-1.5 text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.boundToBaseUrl}
              onChange={(e) => updateField('boundToBaseUrl', e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <div>
              <span className="text-sm font-medium text-gray-300">Stay on same domain</span>
              <p className="text-xs text-gray-500">Only crawl links from the same origin as the starting URL</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.headless}
              onChange={(e) => updateField('headless', e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <div>
              <span className="text-sm font-medium text-gray-300">Headless mode</span>
              <p className="text-xs text-gray-500">Run browser invisibly (faster, uses less resources)</p>
            </div>
          </label>
        </div>

        {/* Exclude Patterns */}
        <div>
          <label className="block text-sm font-medium text-gray-300">URL Exclude Patterns</label>
          <p className="text-xs text-gray-500 mt-0.5">URLs matching these patterns (regex or substring) will be skipped</p>
          <div className="mt-2 space-y-2">
            {(config.excludePatterns || []).map((pattern, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="flex-1 rounded bg-white/5 px-2.5 py-1 text-sm text-gray-300 ring-1 ring-inset ring-white/10">
                  {pattern}
                </code>
                <button
                  onClick={() => removePattern(i)}
                  className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                placeholder="e.g. /login|/admin|\\.pdf$"
                className="flex-1 rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm text-white ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={addPattern}
                className="flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/20 transition-colors"
              >
                <PlusIcon className="h-4 w-4" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors"
          >
            Save Settings
          </button>
          {saved && (
            <span className="text-sm text-green-400">Saved!</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
