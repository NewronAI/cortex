import React, {useEffect, useMemo, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {ArrowPathIcon} from "@heroicons/react/20/solid";
import {insertData} from "../store/slices/appDataSlice";
import {Link, useNavigate} from "react-router-dom";

const {ipcRenderer} = window.require('electron');
const path = window.require('path');

const CrawlingStatusPage = () => {

    const currentPath = useSelector(state => state.appData.currentPath);
    const links = useSelector(state => state.appData.links);

    const navigate = useNavigate();

    const [outputURL, setOutputURL] = useState(null);

    const dispatch = useDispatch();

    const crawledLinks = useMemo(() => {
        return links.filter(link => link.crawled);
    }, [links]);
    const skippedLinks = useMemo(() => {
        return links.filter(link => link.skipped);
    }, [links]);


    useEffect(() => {

        if(currentPath !== null) {
            const outputPath = path.resolve("~/cortex/output");
            setOutputURL(outputPath);
        }

        ipcRenderer.on('crawl', (event, arg) => {
            // console.log(arg)
            dispatch(insertData(arg));
        });

        ipcRenderer.on('crawl-finished', (event, arg) => {
            const basePath = path.resolve("~/cortex/output");
            const outputURL = path.join(basePath, arg);
            navigate("finished?outputURL=" + encodeURIComponent(outputURL));
        })

    }, []);

    return (
        <div>
            <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-6">
                <div className="mx-auto max-w-2xl lg:max-w-none">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Cortex is Crawling</h2>
                        <p className="mt-2 text-md leading-8 text-gray-300">
                            The crawler has started crawling pages. You can see the status of the crawler below.
                        </p>
                        <p className="mt-2 text-sm leading-8 text-gray-400">
                            Output will be saved in : <code className={"text-white"}>{outputURL}</code>
                        </p>
                    </div>
                    <div className={"w-full flex items-center"}>
                        <ArrowPathIcon className={"h-5 animate-spin mx-auto"} />
                    </div>
                    <dl className="mt-8 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
                        <div  className="flex flex-col bg-white/5 p-8">
                            <dt className="text-sm font-semibold leading-6 text-gray-300">Currently Crawling</dt>
                            <dd className="order-first text-3xl font-semibold tracking-tight text-white truncate">{currentPath}</dd>
                        </div>
                        <Link to={"/links"}>
                            <div  className="flex flex-col bg-white/5 p-8">
                                <dt className="text-sm font-semibold leading-6 text-gray-300">Found Links</dt>
                                <dd className="order-first text-3xl font-semibold tracking-tight text-white">{links.length}</dd>
                            </div>
                        </Link>
                        <Link to={"/links"}>
                            <div  className="flex flex-col bg-white/5 p-8">
                                <dt className="text-sm font-semibold leading-6 text-gray-300">Crawled Links</dt>
                                <dd className="order-first text-3xl font-semibold tracking-tight text-white">{crawledLinks.length}</dd>
                            </div>
                        </Link>
                        <Link to={"/links"}>
                            <div  className="flex flex-col bg-white/5 p-8">
                                <dt className="text-sm font-semibold leading-6 text-gray-300">Skipped Links</dt>
                                <dd className="order-first text-3xl font-semibold tracking-tight text-white">{skippedLinks.length}</dd>
                            </div>
                        </Link>
                    </dl>
                </div>
                <div className={"flex items-center text-center w-full"}>
                    <img alt={"Newron Logo"} src={"newron-logo.png"} width={50} className={"my-2 mx-auto drop-shadow shadow-amber-50"} />
                </div>
            </div>
        </div>
    );
};

export default CrawlingStatusPage;