// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';
import { Platform } from 'react-native';
// ネイティブ対応する時は AsyncStorage を入れて下行を有効化
// import AsyncStorage from '@react-native-async-storage/async-storage';

declare global { var __sbClient__: SupabaseClient | undefined; }

function makeClient() {
  return createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      storageKey: 'sb-card-demo-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
      // storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    },
  });
}

export const supabase: SupabaseClient =
  globalThis.__sbClient__ ?? (globalThis.__sbClient__ = makeClient());
