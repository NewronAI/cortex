import React from 'react';
import { MinusIcon, StopIcon, XMarkIcon } from '@heroicons/react/20/solid';

const TitleBar = () => {
  return (
    <div
      className="flex items-center justify-between bg-gray-950 px-4 py-1.5 select-none"
      style={{ WebkitAppRegion: 'drag' }}
    >
      <div className="flex items-center gap-2">
        <img src="newron-logo.png" width={18} height={18} alt="Logo" />
        <span className="text-xs text-gray-500 font-medium">Cortex</span>
      </div>
      <div className="flex gap-0.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => window.electronAPI.send('window-minimize')}
          className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300 transition-colors"
          title="Minimize"
        >
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI.send('window-maximize')}
          className="rounded p-1 text-gray-500 hover:bg-white/10 hover:text-gray-300 transition-colors"
          title="Maximize"
        >
          <StopIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => window.electronAPI.send('window-close')}
          className="rounded p-1 text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Close"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
