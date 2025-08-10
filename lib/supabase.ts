// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// 可能なら @env から読む（SDK50 以降は babel-preset-expo + dotenv で置換される）
let E_URL: string | undefined;
let E_KEY: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const env = require('@env');
  E_URL = env.EXPO_PUBLIC_SUPABASE_URL;
  E_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
} catch {
  // noop: fallback to process.env below
}

function readEnv(name: string) {
  return (name === 'EXPO_PUBLIC_SUPABASE_URL' ? E_URL : E_KEY) ??
         (process.env as any)[name];
}

declare global { var __sbClient__: SupabaseClient | undefined; }

function makeClient() {
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL');
  const key = readEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !key) {
    console.error('[Supabase env missing]', {
      url,
      hasKey: !!key,
      fromProcess: {
        url: (process.env as any).EXPO_PUBLIC_SUPABASE_URL,
        hasKey: !!(process.env as any).EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(url, key, {
    auth: {
      storageKey: 'sb-card-demo-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
      // （ネイティブ永続化が必要になったら AsyncStorage を追加）
    },
  });
}

export const supabase: SupabaseClient =
  globalThis.__sbClient__ ?? (globalThis.__sbClient__ = makeClient());
