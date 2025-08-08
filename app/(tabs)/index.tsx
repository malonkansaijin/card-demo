//app/(tabs)/index.tsx の最終形:

/* app/(tabs)/index.tsx */

import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Button, Provider as PaperProvider } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
} from '@env';

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

type CardDefinition = { id: string; title: string; rarity: string; img_url: string };

export default function Home() {
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [drawnCards, setDrawnCards] = useState<CardDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePackSelection = async (item: number) => {
    setSelectedPack(item);
    setLoading(true);

    const { data, error } = await supabase.rpc('weighted_draw_replace', {
      _set_id: 1,
      _n: 5,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
    
    const drawnCardsData = data as CardDefinition[];
    setDrawnCards(drawnCardsData);

    const { error: insertError } = await supabase.from('collection').insert(
      drawnCardsData.map((card) => ({ card_id: card.id }))
    );

    if (insertError) {
        alert(insertError.message);
    }

    setLoading(false);
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
                <Image
                  source={require('../../assets/pack.png')}
                  style={styles.pack}
                />
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
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item, index }) => (
                  <Image
                    key={index}
                    source={{ uri: item.img_url }}
                    style={styles.card}
                    cachePolicy={'none'}
                    transition={null}
                  />
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
  fill:      { flex: 1 },
  centerList:{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
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
