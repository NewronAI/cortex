import {configureStore} from '@reduxjs/toolkit'
import appDataReducer from './slices/appDataSlice'

export const store = configureStore({
    reducer: {
        appData: appDataReducer,
    },
})

