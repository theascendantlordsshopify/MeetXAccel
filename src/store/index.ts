import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'

// Import slices
import authSlice from './slices/authSlice'
import appSlice from './slices/appSlice'
import userSlice from './slices/userSlice'
import profileSlice from './slices/profileSlice'
import teamSlice from './slices/teamSlice'
import sessionSlice from './slices/sessionSlice'
import mfaSlice from './slices/mfaSlice'
import ssoSlice from './slices/ssoSlice'

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  app: appSlice,
  user: userSlice,
  profile: profileSlice,
  team: teamSlice,
  session: sessionSlice,
  mfa: mfaSlice,
  sso: ssoSlice
})

// Persist configuration
const persistConfig = {
  key: 'calendly-clone',
  version: 1,
  storage,
  whitelist: ['auth', 'app'], // Only persist auth and app state
  blacklist: ['user', 'profile', 'team', 'session', 'mfa', 'sso'] // Don't persist sensitive data
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat([
      // Add custom middleware here if needed
    ]),
  devTools: import.meta.env.DEV
})

export const persistor = persistStore(store)

// Types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector