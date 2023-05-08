import {createSlice} from '@reduxjs/toolkit'

const initialState = {
    currentPath: null,
    links: [],
}

export const appDataSlice = createSlice({
    name: 'appData',
    initialState,
    reducers: {
        insertData: (state, action) => {
            state.currentPath = action.payload.currentPath;
            state.links = action.payload.links;
        },
        updateLinks: (state, action) => {
            state.links = action.payload.links
        },
    },
})

// Action creators are generated for each case reducer function
export const { insertData, updateLinks } = appDataSlice.actions

export default appDataSlice.reducer