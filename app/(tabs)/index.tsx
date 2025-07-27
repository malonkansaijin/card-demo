/* app/(tabs)/index.tsx */

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Button, Provider as PaperProvider } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
} from '@env';

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

type Card = { id: string; title: string; rarity: string; img_url: string };

export default function Home() {
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  const openPack = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc('weighted_draw_replace', {
      _set_id: 1,        // あなたの set_id
      _n: 5,
    });

    if (error) {
      alert(error.message);
    } else {
      const cardsArr = data as Card[];
      setCards(cardsArr);

      /* 🔽 引いたカードを collection テーブルへ保存 */
      await supabase.from('collection').insert(
        cardsArr.map((c) => ({ card_id: c.id }))
      );
    }
    setLoading(false);
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        {/* ── 縦中央エリア ── */}
        {selectedPack === null ? (
          <FlatList
            key="packs"
            data={[0, 1, 2, 3, 4]}
            horizontal
            style={styles.fill}
            contentContainerStyle={styles.centerList}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(i) => i.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setSelectedPack(item)}>
                <Image
                  source={require('../../assets/pack.png')}
                  style={styles.pack}
                />
              </TouchableOpacity>
            )}
          />
        ) : (
          <FlatList
            key="cards"
            data={cards}
            numColumns={3}
            style={styles.fill}
            contentContainerStyle={styles.centerList}
            keyExtractor={(item, i) => item.id + i}
            renderItem={({ item }) => (
              <Image source={{ uri: item.img_url }} style={styles.card} />
            )}
          />
        )}

        {/* ── 下部ボタン ── */}
        {selectedPack !== null && (
          <View style={styles.bottomBar}>
            <Button
              mode="contained"
              onPress={openPack}
              loading={loading}
              style={styles.openButton}
            >
              Open Pack #{selectedPack + 1}
            </Button>
            <Button
              disabled={loading}
              onPress={() => {
                setSelectedPack(null);
                setCards([]);
              }}
            >
              Choose another pack
            </Button>
          </View>
        )}
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fill:      { flex: 1 },
  centerList:{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' },

  pack: {
    width: 160,          // ← 好みでサイズ調整
    height: 240,
    marginHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  card: {
    width: 100,
    height: 140,
    margin: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  openButton: { width: 220, marginBottom: 8 },
});
