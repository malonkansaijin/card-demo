// app/(tabs)/mycards/[id].tsx
import 'react-native-url-polyfill/auto';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  Provider as PaperProvider,
  Text,
  Button,
  Chip,
  Dialog,
  Portal,
  RadioButton,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import CardImage from '../../components/CardImage';

type Rarity = 'C' | 'R' | 'SR' | 'UR';
type Card = {
  id: string;
  title: string | null;
  img_url: string;
  rarity: Rarity;
  pack_id: string | null;
  created_at: string;
};
type Series = { id: string; name: string };

const rarityColor = (r: Rarity) =>
  ({ C: '#9CA3AF', R: '#3B82F6', SR: '#22C55E', UR: '#F59E0B' }[r] as string);

/** Supabase Storage のURL/キーなら署名付きURLに変換する */
async function toSignedUrlIfNeeded(raw: string | null | undefined) {
  if (!raw) return null;

  try {
    const u = new URL(raw);
    if (u.searchParams.has('token')) return raw;

    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!m) return raw;

    const bucket = m[1];
    const key = decodeURIComponent(m[2]);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(key, 60 * 60);
    if (error || !data?.signedUrl) return raw;
    return data.signedUrl;
  } catch {
    // raw が "bucket/key..." の形式ならフォールバック
    const key = raw.replace(/^\/+/, '');
    const slash = key.indexOf('/');
    if (slash <= 0) return raw;
    const bucket = key.slice(0, slash);
    const objectKey = key.slice(slash + 1);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectKey, 60 * 60);
    if (error || !data?.signedUrl) return raw;
    return data.signedUrl;
  }
}

export default function MyCardsFolderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); // 'unsorted' or series id
  const isUnsorted = id === 'unsorted';

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [filter, setFilter] = useState<Rarity | 'ALL'>('ALL');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [targetPack, setTargetPack] = useState<string | 'unsorted' | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      const [{ data: serData }, { data: cardData }] = await Promise.all([
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

      setSeries((serData ?? []) as Series[]);

      // ★ 画像URLを署名URLへ差し替え
      const rows = (cardData ?? []) as Card[];
      const signed = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          img_url: (await toSignedUrlIfNeeded(r.img_url)) ?? r.img_url,
        }))
      );
      setCards(signed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const folderName = useMemo(() => {
    if (isUnsorted) return '未分類';
    const s = series.find((x) => x.id === id);
    return s?.name ?? 'フォルダー';
  }, [series, id, isUnsorted]);

  const list = useMemo(() => {
    const within = cards.filter((c) => (isUnsorted ? c.pack_id == null : c.pack_id === id));
    return filter === 'ALL' ? within : within.filter((c) => c.rarity === filter);
  }, [cards, filter, id, isUnsorted]);

  const openMove = (cardId: string) => {
    setSelectedCardId(cardId);
    setTargetPack(isUnsorted ? 'unsorted' : (id as string));
    setMoveOpen(true);
  };

  const doMove = async () => {
    if (!selectedCardId) return;
    try {
      const target = targetPack === 'unsorted' ? null : targetPack;
      const { error } = await supabase
        .from('user_cards')
        .update({ pack_id: target })
        .eq('id', selectedCardId);
      if (error) throw error;

      // ローカルも更新
      setCards((prev) =>
        prev.map((c) => (c.id === selectedCardId ? { ...c, pack_id: target } : c))
      );
      setMoveOpen(false);
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Button mode="outlined" onPress={() => router.back()} style={styles.backBtn}>
            Back
          </Button>
          <Text style={styles.title}>{folderName}</Text>
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.filters}>
          {(['ALL', 'C', 'R', 'SR', 'UR'] as const).map((r) => (
            <Chip
              key={r}
              selected={filter === r}
              onPress={() => setFilter(r as any)}
              style={styles.chip}
              selectedColor="#fff"
            >
              {r}
            </Chip>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: '#aaa' }}>カードがありません</Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                onLongPress={() => openMove(item.id)}
                onPress={() => setPreviewUrl(item.img_url)}
              >
                <View style={styles.cardBox}>
                  <CardImage src={item.img_url} style={styles.cardImg} />
                  <View style={[styles.badge, { backgroundColor: rarityColor(item.rarity) }]}>
                    <Text style={styles.badgeText}>{item.rarity}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {/* 画像プレビュー（タップで閉じる） */}
        <Modal
          visible={!!previewUrl}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewUrl(null)}
        >
          <TouchableWithoutFeedback onPress={() => setPreviewUrl(null)}>
            <View style={styles.modalBg}>
              {previewUrl ? <CardImage src={previewUrl} style={styles.modalImg} /> : null}
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* 移動ダイアログ */}
        <Portal>
          <Dialog visible={moveOpen} onDismiss={() => setMoveOpen(false)}>
            <Dialog.Title>フォルダーへ移動</Dialog.Title>
            <Dialog.Content>
              <RadioButton.Group
                onValueChange={(v) => setTargetPack(v as any)}
                value={targetPack ?? 'unsorted'}
              >
                <RadioButton.Item label="未分類" value="unsorted" />
                {series.map((s) => (
                  <RadioButton.Item key={s.id} label={s.name} value={s.id} />
                ))}
              </RadioButton.Group>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setMoveOpen(false)}>キャンセル</Button>
              <Button onPress={doMove}>移動</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  backBtn: { borderRadius: 18, height: 32, justifyContent: 'center' },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 6 },
  chip: { backgroundColor: '#1f2937' },

  cardBox: {
    width: 110,
    height: 154,
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardImg: { width: '100%', height: '100%', backgroundColor: '#000' },
  badge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#000', fontWeight: '800', fontSize: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  modalImg: { width: '92%', height: '80%', backgroundColor: '#000' },
});
