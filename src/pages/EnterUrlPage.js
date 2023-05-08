import {PaperAirplaneIcon} from '@heroicons/react/24/outline'
import {handleFileLinkFound} from "../handlers/processHandler";
import {useDispatch, useSelector} from "react-redux";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";

const {ipcRenderer} = window.require('electron');

const path = window.require('path');
const os = window.require("os");


function App() {

    const dispatch = useDispatch();
    const currentPath = useSelector(state => state.appData.currentPath);
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    function handleFormSubmit(e) {
        e.preventDefault();
        const url = e.target.url.value;
        // console.log(url);
        setLoading(true);
        ipcRenderer.send('crawl', url);

        function overLoadedDispatch(data) {
            setLoading(false);
            dispatch(data);
        }

        function handleCrawlFailed(){
            setLoading(false);
        }

        ipcRenderer.once('crawl-finished', (event, arg) => {
            console.log("Crawling Finished", arg, "From CrawlingStatusPage.js");
            const basePath = path.resolve(os.homedir()+"/cortex/output");
            const outputURL = path.join(basePath, arg);
            navigate("/finished?outputURL=" + encodeURIComponent(outputURL));
        });

        ipcRenderer.once('crawl', handleFileLinkFound(overLoadedDispatch));
        ipcRenderer.once("crawl-failed",handleCrawlFailed);
    }

    useEffect(() => {
        console.log(currentPath, "From EnterUrlPage");
        if(currentPath !== null) {
            navigate("/crawl");
        }
    }, [currentPath]);

    return (
        <div className="py-16 sm:py-24 lg:py-32">
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
                                    defaultValue={"https://www.newron.ai"}
                                    className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                                    placeholder="Enter a URL"
                                />
                                <button
                                    type="submit"
                                    className="flex items-center gap-3 rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                                    disabled={loading}
                                >
                                    {loading ? <>Starting Crawl...</> :<>Start crawling <PaperAirplaneIcon className={"h-4"}/></>}
                                </button>
                            </div>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
