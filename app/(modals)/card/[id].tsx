import 'react-native-url-polyfill/auto';

import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView, View, ActivityIndicator, StyleSheet, Button, Alert } from 'react-native';
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
    return m ? { bucket: m[1], objectKey: m[2] } : null;
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
  return data.signedUrl; // /object/sign/...
}

function makeRenderUrl(raw: string, w = 1200) {
  try {
    const u = new URL(raw);
    u.pathname = u.pathname.replace('/storage/v1/object/', '/storage/v1/render/image/');
    u.searchParams.set('width', String(w));  // 拡大用は少し大きめ
    u.searchParams.set('quality', '90');
    u.searchParams.set('format', 'png');     // webp ではなく png に固定
    return u.toString();
  } catch {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}width=${w}&quality=90&format=png`;
  }
}

async function ensureInitialUrl(raw: string) {
  // まず必ず新しい /object/sign を発行（これが一番安定）
  return freshObjectSignedUrl(raw);
}

async function fallbackToRenderPng(raw: string) {
  // 署名を取り直してから /render+png
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
        // cards テーブルから最小限で取得（img_url）
        const { data, error } = await supabase
          .from('cards')
          .select('img_url')
          .eq('id', id)
          .maybeSingle<CardRow>();
        if (error) throw error;

        if (!data?.img_url) {
          Alert.alert('Not found', '画像URLが見つかりませんでした。');
          setLoading(false);
          return;
        }

        const initial = await ensureInitialUrl(data.img_url);
        setUrl(initial);
      } catch (e: any) {
        Alert.alert('Load error', e?.message ?? 'Unknown error');
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
      <View style={styles.topBar}>
        <Button title="Close" onPress={() => router.back()} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : (
        url && (
          <ExpoImage
            source={{ uri: url }}
            style={styles.image}
            contentFit="contain"    // 拡大表示（余白内に最大化）
            transition={150}
            cachePolicy="memory-disk"
            allowDownscaling
            onError={onError}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  topBar: { padding: 8 },
  image: {
    flex: 1,
    width: '100%',
    // Webの影警告は出ないよう boxShadow のみ使いたい場合は必要に応じてここに条件分岐で追加
  },
});
