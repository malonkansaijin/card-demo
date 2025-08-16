// app/(tabs)/mycards/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Provider as PaperProvider,
  Text,
  Button,
  Dialog,
  Portal,
  TextInput,
  ActivityIndicator,
} from 'react-native-paper';
import { supabase } from '@/lib/supabase';
import CardImage from '../../components/CardImage';

type CardRow = {
  id: string;
  title: string | null;
  img_url: string;
  rarity: 'C' | 'R' | 'SR' | 'UR';
  pack_id: string | null;
  created_at: string;
};

type Series = { id: string; name: string };

const rarityColor = (r: CardRow['rarity']) =>
  ({ C: '#9CA3AF', R: '#3B82F6', SR: '#22C55E', UR: '#F59E0B' }[r] as string);

/** Supabase Storage の URL/キーから署名付きURLに差し替える */
async function toSignedUrlIfNeeded(raw: string | null | undefined) {
  if (!raw) return null;

  // 既に署名トークン付きならそのまま
  try {
    const u = new URL(raw);
    if (u.searchParams.has('token')) return raw;

    // /storage/v1/object/(public|sign)/<bucket>/<key...>
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!m) return raw; // Supabase 以外の URL はそのまま返す
    const bucket = m[1];
    const key = decodeURIComponent(m[2]);

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, 60 * 60); // 1時間

    if (error || !data?.signedUrl) return raw;
    return data.signedUrl;
  } catch {
    // URL としてパースできない場合（もし img_url がオブジェクトキーだけだった時のフォールバック）
    const key = raw.replace(/^\/+/, '');
    const slash = key.indexOf('/');
    if (slash <= 0) return raw;
    const bucket = key.slice(0, slash);
    const objectKey = key.slice(slash + 1);
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(objectKey, 60 * 60);
    if (error || !data?.signedUrl) return raw;
    return data.signedUrl;
  }
}

export default function MyCards() {
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [series, setSeries] = useState<Series[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        setNeedsLogin(true);
        setSeries([]);
        setCards([]);
        return;
      }

      const [{ data: s }, { data: c }] = await Promise.all([
        supabase
          .from('pack_series')
          .select('id,name')
          .eq('owner_id', uid)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_cards')
          .select('id,title,img_url,rarity,pack_id,created_at')
          .eq('owner_id', uid)
          .order('created_at', { ascending: false }),
      ]);

      setSeries((s ?? []) as Series[]);

      // ★ 取得した img_url を署名付きURLに差し替える（Private バケットでも表示可）
      const rows = (c ?? []) as CardRow[];
      const signed = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          img_url: (await toSignedUrlIfNeeded(r.img_url)) ?? r.img_url,
        }))
      );
      setCards(signed);

      setNeedsLogin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const groups = useMemo(() => {
    const list: { id: string; name: string; items: CardRow[] }[] = [];
    const unsorted = cards.filter((c) => !c.pack_id);
    list.push({ id: 'unsorted', name: '未分類', items: unsorted });
    for (const s of series) {
      list.push({ id: s.id, name: s.name, items: cards.filter((c) => c.pack_id === s.id) });
    }
    return list;
  }, [cards, series]);

  const createFolder = async () => {
    if (!newName.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    await supabase.from('pack_series').insert({ name: newName.trim(), owner_id: uid });
    setNewName('');
    setCreating(false);
    await fetchAll();
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>My Cards</Text>
          {!needsLogin && (
            <Button mode="contained" onPress={() => setCreating(true)} style={styles.newBtn}>
              ＋ 新規フォルダー
            </Button>
          )}
        </View>

        {needsLogin ? (
          <View style={styles.center}>
            <Text style={{ color: '#bbb' }}>ログインが必要です</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item: group }) => (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.groupTitle}>{group.name}</Text>
                {group.items.length === 0 ? (
                  <Text style={styles.empty}>0枚</Text>
                ) : (
                  <FlatList
                    data={group.items}
                    keyExtractor={(c) => c.id}
                    numColumns={2}
                    columnWrapperStyle={{ gap: 10 }}
                    contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity activeOpacity={0.85} style={styles.cardBox}>
                        <CardImage src={item.img_url} style={styles.cardImage} />
                        <View
                          style={[
                            styles.rarityBadge,
                            { backgroundColor: rarityColor(item.rarity) },
                          ]}
                        >
                          <Text style={styles.rarityText}>{item.rarity}</Text>
                        </View>
                        {!!item.title && (
                          <Text numberOfLines={1} style={styles.caption}>
                            {item.title}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            )}
          />
        )}

        <Portal>
          <Dialog visible={creating} onDismiss={() => setCreating(false)}>
            <Dialog.Title>新規フォルダー</Dialog.Title>
            <Dialog.Content>
              <TextInput
                mode="outlined"
                placeholder="シリーズ名"
                value={newName}
                onChangeText={setNewName}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCreating(false)}>キャンセル</Button>
              <Button onPress={createFolder}>作成</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0b0b' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  newBtn: { borderRadius: 22, backgroundColor: '#6b4fd3' },

  groupTitle: { color: '#ddd', fontSize: 16, fontWeight: '700', marginBottom: 8, paddingHorizontal: 16 },
  empty: { color: '#666', paddingHorizontal: 16 },

  cardBox: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardImage: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#000' },
  caption: { color: '#ccc', fontSize: 12, paddingHorizontal: 8, paddingVertical: 6 },
  rarityBadge: { position: 'absolute', top: 8, right: 8, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  rarityText: { color: '#000', fontWeight: '700', fontSize: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
