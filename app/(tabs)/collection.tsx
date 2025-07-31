// app/(tabs)/collection.tsx
// ------------------------------------------------------------
// コレクション一覧タブ (ファイルを /collection.tsx に統一)
// ------------------------------------------------------------
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Image,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  Button,
  TouchableOpacity,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';
import { router, useFocusEffect } from 'expo-router';

/* ---------- Supabase ---------- */
const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

type Row = { card_id: string; cards: { img_url: string } };
type Item = { card_id: string; img_url: string; count: number };

export default function Collection() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  /* フォーカスされるたびに再読込 */
  useFocusEffect(
    React.useCallback(() => {
      loadCollection();
    }, []),
  );

  async function loadCollection() {
    setLoading(true);

    const { data, error } = await supabase
      .from('collection')
      .select('card_id, cards ( img_url )')
      .order('created_at', { ascending: false });

    if (error) {
      alert('Load error: ' + error.message);
      setLoading(false);
      return;
    }

    /* --------- 重複カードを集計 --------- */
    const map = new Map<string, Item>();
    (data as Row[]).forEach((row) => {
      const e = map.get(row.card_id);
      if (e) e.count += 1;
      else
        map.set(row.card_id, {
          card_id: row.card_id,
          img_url: row.cards.img_url,
          count: 1,
        });
    });
    setItems(Array.from(map.values()));
    setLoading(false);
  }

  /* --------- 画面 --------- */
  return (
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardWrap}
              onPress={() =>
                router.push({
                  pathname: '/(modals)/card/[id]',
                  params: { id: item.card_id },
                })
              }
            >
              <Image source={{ uri: item.img_url }} style={styles.card} />
              {item.count > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>×{item.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ color: '#888', marginBottom: 12 }}>
                No cards yet
              </Text>
              <Button
                title="Open Packs!"
                onPress={() => router.replace('/home')}
              />
            </View>
          }
        />
      )}

      {/* 一番下に戻るボタン */}
      <Button title="Back to Home" onPress={() => router.replace('/home')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  grid: {
    paddingHorizontal: 12,
    paddingTop: 60,
    alignItems: 'flex-start',
    paddingBottom: 24,
  },
  row: { justifyContent: 'flex-start' },
  cardWrap: { margin: 6 },
  card: {
    width: 110,
    height: 154,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
