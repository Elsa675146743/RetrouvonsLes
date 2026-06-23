import { AppState } from 'react-native';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// TEST TEMPORAIRE
supabase.auth.signInWithPassword({
  email: 'test@test.com',
  password: 'test123'
}).then(({ data, error }) => {
  console.log('TEST SUPABASE RESULT:', JSON.stringify(error));
}).catch(err => {
  console.log('TEST FETCH ERROR:', JSON.stringify(err));
});

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});