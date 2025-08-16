// app/(tabs)/collection.tsx
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Button, Provider as PaperProvider } from 'react-native-paper';
import { supabase } from '@/lib/supabase';

type Row  = { card_id: string; cards: { img_url: string } };
type Item = { card_id: string; img_url: string; count: number };

// /object → /render に変換して png で描画（フォールバック用）
function makeRenderUrl(raw: string, w = 512) {
  try {
    const u = new URL(raw);
    u.pathname = u.pathname.replace('/storage/v1/object/', '/storage/v1/render/image/');
    u.searchParams.set('width',  String(w));
    u.searchParams.set('quality','85');
    u.searchParams.set('format', 'png');
    return u.toString();
  } catch {
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}width=${w}&quality=85&format=png`;
  }
}

// URL → {bucket, objectKey}
function parseStoragePath(raw: string) {
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:sign\/)?([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], objectKey: m[2] };
  } catch {
    return null;
  }
}

// 署名URLを新規発行
async function freshObjectSignedUrl(raw: string, expires = 600) {
  const parsed = parseStoragePath(raw);
  if (!parsed) return raw;
  const { bucket, objectKey } = parsed;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectKey, expires);
  if (error || !data?.signedUrl) return raw;
  return data.signedUrl; // /storage/v1/object/sign/...
}

// 初回に使うURL（=新規署名のみ）
async function ensureInitialUrl(raw: string) {
  return freshObjectSignedUrl(raw);
}

// エラー時の最終手段：再署名 → /render+png
async function fallbackToRenderPng(raw: string) {
  const objUrl = await freshObjectSignedUrl(raw);
  return makeRenderUrl(objUrl, 512);
}

export default function Collection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const triedFallback = useRef<Set<string>>(new Set());

  useFocusEffect(React.useCallback(() => { loadCollection(); }, []));

  async function loadCollection() {
    setLoading(true);

    const { data, error } = await supabase
      .from('collection')
      .select('card_id, cards ( img_url )')
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Load error', error.message);
      setLoading(false);
      return;
    }

    // 重複集計
    const map = new Map<string, Item>();
    (data as Row[]).forEach((row) => {
      const e = map.get(row.card_id);
      if (e) e.count += 1;
      else map.set(row.card_id, { card_id: row.card_id, img_url: row.cards.img_url, count: 1 });
    });

    // 画像URLに新規署名
    const arr = await Promise.all(
      Array.from(map.values()).map(async (it) => ({
        ...it,
        img_url: await ensureInitialUrl(it.img_url),
      }))
    );

    setItems(arr);
    setLoading(false);
  }

  const renderCard = ({ item }: { item: Item }) => {
    const onPress = () =>
      router.push({ pathname: '/(modals)/card/[id]', params: { id: item.card_id } });

    const onError = async () => {
      if (triedFallback.current.has(item.card_id)) return;
      triedFallback.current.add(item.card_id);
      const retry = await fallbackToRenderPng(item.img_url);
      setItems((prev) =>
        prev.map((it) => (it.card_id === item.card_id ? { ...it, img_url: retry } : it)),
      );
    };

    return (
      <TouchableOpacity style={styles.cardWrap} onPress={onPress}>
        <ExpoImage
          source={{ uri: item.img_url }}
          style={styles.card}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          allowDownscaling
          recyclingKey={item.card_id}
          onError={onError}
        />
        {item.count > 1 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>×{item.count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.safe}>
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={items}
            numColumns={3}
            keyExtractor={(it) => it.card_id}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.row}
            renderItem={renderCard}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ color: '#888', marginBottom: 12 }}>No cards yet</Text>
                <Button mode="contained" onPress={() => router.replace('/home')}>Home</Button>
              </View>
            }
          />
        )}

        {/* ▼ フッター：Home ボタンのみ */}
        <View style={styles.bottomBar}>
          <Button
            mode="contained"
            onPress={() => { router.replace('/home'); }}
            style={styles.openButton}
          >
            Home
          </Button>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  grid: { paddingHorizontal: 12, paddingTop: 60, paddingBottom: 96, alignItems: 'flex-start' },
  row: { justifyContent: 'flex-start' },
  cardWrap: { margin: 6 },
  card: {
    width: 110, height: 154,
    borderRadius: 8, borderWidth: 1, borderColor: '#ccc',
    backgroundColor: '#111', overflow: 'hidden',
  },
  badge: {
    position: 'absolute', right: -4, top: -4,
    backgroundColor: '#ff3b30', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // フッター（Open Packs の見た目と統一）
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  openButton: { width: 140, marginBottom: 8 },
});
