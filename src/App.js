import logo from './logo.svg';

import {CalendarDaysIcon, HandRaisedIcon, PaperAirplaneIcon} from '@heroicons/react/24/outline'

const {ipcRenderer} = window.require('electron')

function App() {

    function handleFormSubmit(e) {
        e.preventDefault();
        const url = e.target.url.value;
        // console.log(url);
        ipcRenderer.send('crawl', url);
    }

  return (
    <div className="">
        <div className="min-h-screen relative isolate overflow-hidden bg-gray-900 py-16 sm:py-24 lg:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2 justify-center flex">
                    <div className="max-w-xl lg:max-w-lg">
                        <div>
                            <img alt={"Newron Logo"} src={"newron-logo.png"} width={100} className={"my-2"} />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl select-none">Cortex by Newron.ai</h2>
                        <p className="mt-4 text-lg leading-8 text-gray-300 select-none">
                            Cortex is a web crawler that can be used to crawl websites and extract data from them. It is zero-config and can be used to crawl any website.
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
                                    className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    placeholder="Enter a URL"
                                />
                                <button
                                    type="submit"
                                    className="flex items-center gap-3 rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                >
                                    Start crawling <PaperAirplaneIcon className={"h-4"} />
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            </div>
            <div className="absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6" aria-hidden="true">
                <div
                    className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
                    style={{
                        clipPath:
                            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                    }}
                />
            </div>
        </div>
    </div>
  );
}

export default App;
