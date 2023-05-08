import {insertData} from "../store/slices/appDataSlice";

export const handleFileLinkFound = (dispatch) => (event,appData) => {

    const currentPath = appData.currentPath;
    const links = appData.links;

    dispatch(insertData({
        currentPath: currentPath,
        links: links
    }));
}

