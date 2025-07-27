/* app/(modals)/card/[id].tsx
   1 枚カードの詳細モーダル
   ─────────────────────────── */
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
} from '@env';

/* ───────── Supabase ───────── */
const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

type Card = {
  id: string;
  title: string;
  rarity: string;
  img_url: string;
  created_at: string;
};

export default function CardModal() {
  /* ① URL パラメータ取得 （collection.tsx から渡す） */
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<Card | null>(null);

  /* ② Supabase から 1 枚取得 */
  useEffect(() => {
    if (!id) return;

    (async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', id)
        .single<Card>();

      if (error) console.warn('Load card error:', error.message);
      setCard(data);
    })();
  }, [id]);

  /* ③ ローディング */
  if (!card) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  /* ④ 詳細表示 */
  return (
    <View style={styles.container}>
      {/* ✕ ボタンで閉じる */}
      <IconButton
        icon="close"
        iconColor="#fff"
        size={30}
        style={styles.close}
        onPress={() => router.back()}
      />

      <Image source={{ uri: card.img_url }} style={styles.image} />

      <Text style={styles.title}>{card.title}</Text>
      <Text style={styles.rarity}>{card.rarity}</Text>
      <Text style={styles.date}>
        Acquired&nbsp;:&nbsp;{new Date(card.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

/* ───────── スタイル ───────── */
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  close: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 5,
  },
  image: {
    width: width * 0.8,
    height: width * 1.12, // 7:5 比率程度
    borderRadius: 12,
    marginTop: 96,
  },
  title: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  rarity: {
    fontSize: 18,
    color: '#ffd700',
    marginTop: 4,
  },
  date: {
    marginTop: 16,
    color: '#888',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
