import {createHashRouter, RouterProvider} from "react-router-dom";
import EnterUrlPage from "./pages/EnterUrlPage";
import {store} from "./store";
import {Provider} from "react-redux";
import CrawlingStatusPage from "./pages/CrawlingStatusPage";
import LinksPage from "./pages/LinksPage";

const routes = createHashRouter([
    {path: "/", element: <EnterUrlPage />},
    {path: "/crawl", element: <CrawlingStatusPage />},
    {path: "/links", element: <LinksPage
            title={"Found Links"}
            desc={"These are the links found by the crawler. This list keeps updating as the crawler finds more links."}
        />},
    {path: "/finished", element: <LinksPage title={"Crawling Finished"} desc={"Crawling has finished. You can see the output below."} backLink={false}/>},
])

function App() {
  return (
      <div className="">
          <div className="min-h-screen relative isolate overflow-hidden bg-gray-900 text-white p-2">
              <Provider store={store}>
                  <RouterProvider router={routes} fallbackElement={<>Loading ... </>}/>
              </Provider>
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
