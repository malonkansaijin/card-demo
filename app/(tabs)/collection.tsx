//app/(tabs)/collection.tsx の最終形:

/* app/(tabs)/collection.tsx */
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  FlatList,
  StyleSheet,
  Text,
  ActivityIndicator,
  Button,
  TouchableOpacity,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
} from '@env';
import { router, useFocusEffect } from 'expo-router';

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

type CollectionItem = {
  id: string;
  cards: {
    id: string;
    img_url: string;
  } | null;
};

export default function Collection() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      loadCollection();
    }, [])
  );

  async function loadCollection() {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setItems([]);
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('collection')
      .select('id, card_id, cards ( id, img_url )')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      alert('Load error: ' + error.message);
      setItems([]);
    } else {
      setItems(data as CollectionItem[]);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={items}
          numColumns={3}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            if (!item.cards) return <View style={styles.cardWrap} />;

            return (
              <TouchableOpacity
                style={styles.cardWrap}
                onPress={() =>
                  router.push({
                    pathname: '/(modals)/card/[id]',
                    params: { id: item.cards.id },
                  })
                }
              >
                <Image
                  source={{ uri: item.cards.img_url }}
                  style={styles.card}
                  cachePolicy={'none'}
                  transition={null}
                />
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={{ color: '#888', marginBottom: 12 }}>
                No cards yet
              </Text>
              <Button
                title="Open Packs!"
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          }
        />
      )}
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
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});