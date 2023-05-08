import {ChevronDoubleLeftIcon} from "@heroicons/react/20/solid";
import React, {useEffect, useState} from "react";
import {useSelector} from "react-redux";
import {Link} from "react-router-dom";

const path = window.require('path');
const os = window.require("os");


const LinksPage = ({ title, desc, filter, backLink = true}) => {

    const links = useSelector(state => state.appData.links);
    const [outputURL, setOutputURL] = useState(null);

    useEffect(() => {
        if(outputURL === null) {
            const outputPath = path.resolve(os.homedir() + "/cortex/output");
            setOutputURL(outputPath);
        }
    }, []);

    return (
        <div>
            <div className="mx-auto max-w-7xl px-6 lg:px-8 mt-6">
                {
                    backLink &&
                    <div>
                        <Link to={"/crawl"}>
                            <button className={"flex gap-2 items-center justify-center text-zinc-500 text-sm"}>
                                <ChevronDoubleLeftIcon className={"h-3"}/>
                                Back to Crawling Status
                            </button>
                        </Link>
                    </div>
                }
                <div className="mx-auto max-w-2xl lg:max-w-none">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            {title}
                        </h2>
                        <p className="mt-2 text-md leading-8 text-gray-300">
                            {desc}
                        </p>
                        {
                            outputURL &&
                            <p className="mt-2 text-sm leading-8 text-gray-400">
                                Outputs are saved in : <code className={"text-white"}>{outputURL}</code>
                            </p>
                        }
                    </div>

                    <div className="mt-8 flow-root">
                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-0">
                                            URL
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                            Crawled
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                            Skipped
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">
                                            Depth
                                        </th>

                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                    {links.map((link) => (
                                        <tr key={link.link}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-0 max-w-md truncate">
                                                {link.link}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                {link.crawled ? <span className={"text-green-300"}>Yes</span> : <span className={"text-amber-300"}>No</span>}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-300">
                                                {link.skipped ? <span className={"text-amber-300"}>Yes</span> : <span className={"text-green-300"}>No</span>}
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
                <div className={"flex items-center text-center w-full"}>
                    <img alt={"Newron Logo"} src={"newron-logo.png"} width={50} className={"my-2 mx-auto drop-shadow shadow-amber-50"} />
                </div>
            </div>
        </div>
    )

}

export default LinksPage;