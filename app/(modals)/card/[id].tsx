import 'react-native-url-polyfill/auto';

import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, ActivityIndicator, StyleSheet, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';

type CardRow = { img_url: string | null };

function parseStoragePath(raw: string) {
  try {
    const u = new URL(raw);
    const m = u.pathname.match(
      /\/storage\/v1\/(?:object|render\/image)\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/
    );
    if (!m) return null;
    return { bucket: m[1], objectKey: m[2] };
  } catch {
    return null;
  }
}

async function freshObjectSignedUrl(raw: string, expires = 600) {
  const parsed = parseStoragePath(raw);
  if (!parsed) return raw;
  const { bucket, objectKey } = parsed;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectKey, expires);
  if (error || !data?.signedUrl) return raw;
  return data.signedUrl;
}

function makeRenderUrl(raw: string, w = 1200) {
  try {
    const u = new URL(raw);
    u.pathname = u.pathname.replace('/storage/v1/object/', '/storage/v1/render/image/');
    u.searchParams.set('width', String(w));
    u.searchParams.set('quality', '90');
    u.searchParams.set('format', 'png');
    return u.toString();
  } catch {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}width=${w}&quality=90&format=png`;
  }
}

async function ensureInitialUrl(raw: string) {
  return freshObjectSignedUrl(raw);
}

async function fallbackToRenderPng(raw: string) {
  const objUrl = await freshObjectSignedUrl(raw);
  return makeRenderUrl(objUrl, 1200);
}

export default function CardModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const triedFallback = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('cards')
          .select('img_url')
          .eq('id', id)
          .maybeSingle<CardRow>();
        if (error) throw error;

        if (!data?.img_url) {
          Alert.alert('Not found', '画像URLが見つかりませんでした。');
          router.back();
          return;
        }

        const signed = await ensureInitialUrl(data.img_url);
        setUrl(signed);
      } catch (e: any) {
        Alert.alert('Load failed', e?.message ?? 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onError = async () => {
    if (triedFallback.current || !url) return;
    triedFallback.current = true;
    const retry = await fallbackToRenderPng(url);
    setUrl(retry);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* 画面全体がタップで閉じる */}
      <Pressable style={styles.tapArea} onPress={() => router.back()}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : (
          url && (
            <ExpoImage
              source={{ uri: url }}
              style={styles.image}
              contentFit="contain"
              transition={150}
              cachePolicy="memory-disk"
              allowDownscaling
              onError={onError}
            />
          )
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  // 画像を中央に、小さめに表示するためのラッパー
  tapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16, // 端にベタ付かないよう余白
  },
  // 画面の約 92% 幅 / 80% 高に収める
  image: {
    width: '92%',
    height: '80%',
    borderRadius: 12,
  },
});
