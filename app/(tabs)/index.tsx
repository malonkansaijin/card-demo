/* app/(tabs)/index.tsx */
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import CardImage from '../components/CardImage';

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Button, Provider as PaperProvider } from 'react-native-paper';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';

// バケット名
const BUCKET = 'card-images';

// バケットに実在するテンプレ画像名（スクショ準拠）
const CARD_IMAGE_KEYS = {
  '1':  'card_template_1.jpg',
  'C':  'card_template_c.jpg',
  'R':  'card_template_r.jpg',
  'SR': 'card_template_sr.jpg',
  'UR': 'card_template_ur.jpg',
} as const;

type CardDefinition = {
  id: string | number;
  title: string;
  rarity: string;
  image_key?: string | null;
  img_url?: string | null;
};

// 署名URLを生成
async function signFromKey(objectKey: string): Promise<string | null> {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(objectKey, 60 * 10); // 10分

  if (error || !data?.signedUrl) {
    console.warn('createSignedUrl failed:', objectKey, error?.message);
    return null;
  }
  return data.signedUrl;
}

// URLやレアリティから、必ず存在するキー名に正規化（RPCがimage_keyをまだ返してない場合の保険）
function normalizeToExistingKey(card: CardDefinition): string {
  const m = (card.img_url ?? '').match(/card_template_(ur|sr|r|c|1)\.jpg/i);
  if (m) {
    const tag = m[1].toUpperCase() as keyof typeof CARD_IMAGE_KEYS;
    return CARD_IMAGE_KEYS[tag];
  }
  const r = (card.rarity ?? '').toUpperCase() as keyof typeof CARD_IMAGE_KEYS;
  if (CARD_IMAGE_KEYS[r]) return CARD_IMAGE_KEYS[r];
  return CARD_IMAGE_KEYS.UR;
}

export default function Home() {
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [drawnCards, setDrawnCards] = useState<Required<CardDefinition>[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePackSelection = async (item: number) => {
    if (loading) return;
    setSelectedPack(item);
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('weighted_draw_replace', {
        _set_id: 1,
        _n: 5,
      });
      if (error) throw error;

      const drawn = (data ?? []) as CardDefinition[];

      const signed = await Promise.all(
        drawn.map(async (c) => {
          const key = (c.image_key && typeof c.image_key === 'string' && c.image_key.length > 0)
            ? c.image_key
            : normalizeToExistingKey(c);

          const url = await signFromKey(key);
          return {
            id: c.id,
            title: c.title,
            rarity: c.rarity,
            image_key: key,
            img_url: url ?? '',
          } as Required<CardDefinition>;
        })
      );

      setDrawnCards(signed);

      // コレクション保存（失敗しても表示は続行）
      const { error: insertError } = await supabase
        .from('collection')
        .insert(signed.map((card) => ({ card_id: card.id })));
      if (insertError) {
        console.warn('Insert to collection failed:', insertError.message);
        Alert.alert('Save warning', insertError.message);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert('Draw failed', e?.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
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
              <TouchableOpacity onPress={() => handlePackSelection(item)} disabled={loading}>
                <Image source={require('../../assets/pack.png')} style={styles.pack} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.fill}>
            {loading ? (
              <View style={styles.centerList}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <FlatList
                key="cards"
                data={drawnCards}
                numColumns={3}
                style={styles.fill}
                contentContainerStyle={styles.centerList}
                keyExtractor={(item, index) => String((item as any).id ?? index)}
                extraData={drawnCards.length}
                renderItem={({ item }) => (
                  <CardImage src={item.img_url} style={styles.card} />
                )}
              />
            )}
          </View>
        )}

        {selectedPack !== null && !loading && (
          <View style={styles.bottomBar}>
            <Button
              mode="contained"
              onPress={() => {
                setSelectedPack(null);
                setDrawnCards([]);
              }}
              style={styles.openButton}
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
  fill: { flex: 1 },
  centerList: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  pack: {
    width: 160,
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
