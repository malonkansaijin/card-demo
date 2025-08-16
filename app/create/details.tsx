// app/create/details.tsx
import 'react-native-url-polyfill/auto';
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Alert,
  ScrollView,
  InteractionManager, // ← 追加：マウント完了後に遷移させる
} from 'react-native';
import {
  Provider as PaperProvider,
  Text,
  Button,
  TextInput,
  Dialog,
  Portal,
  RadioButton,
  ActivityIndicator,
} from 'react-native-paper';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getPendingCard, clearPendingCard } from '@/lib/createSession';

type Rarity = 'C' | 'R' | 'SR' | 'UR';
type Series = { id: string; name: string };

const BUCKET = 'card-images';
const rarityColor = (r: Rarity) =>
  ({ C: '#9CA3AF', R: '#3B82F6', SR: '#22C55E', UR: '#F59E0B' }[r] as string);

// dataURL → File にしてアップロード（エラーメッセージを詳細化）
async function uploadDataUrlToSupabase(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const key = `usercards/${fileName}`;
  const file = new File([blob], fileName, { type: 'image/png' });

  console.log('[upload] key =', key, 'size =', file.size);

  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(key, file, { contentType: 'image/png', upsert: true });

  if (error) throw new Error(error.message ?? JSON.stringify(error));

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data.publicUrl;
}

export default function CreateDetails() {
  const { finalImageDataUrl, pendingTitle } = getPendingCard();

  const [title, setTitle] = useState(pendingTitle ?? 'Title');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<Rarity | null>(null);

  const [series, setSeries] = useState<Series[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [packId, setPackId] = useState<string | 'unsorted' | null>('unsorted');

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  // 初回：画像が無ければ create に戻す（※マウント後に実行）
  useEffect(() => {
    if (!finalImageDataUrl) {
      Alert.alert('画像なし', '最初からやり直してください');
      InteractionManager.runAfterInteractions(() => {
        router.replace('/create');
      });
      return;
    }
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data } = await supabase
        .from('pack_series')
        .select('id,name')
        .eq('owner_id', userRes.user.id)
        .order('created_at', { ascending: true });
      setSeries((data ?? []) as Series[]);
    })();
  }, []);

  const previewSrc = useMemo(
    () => finalImageDataUrl || null,
    [finalImageDataUrl]
  );

  const onSave = async () => {
    try {
      if (!rarity) {
        Alert.alert('未選択', 'レアリティを選んでください');
        return;
      }
      if (!finalImageDataUrl) {
        Alert.alert('画像なし', '最初からやり直してください');
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        Alert.alert('ログインが必要です');
        return;
      }

      setSaving(true);

      // 1) 画像アップロード
      const imgUrl = await uploadDataUrlToSupabase(finalImageDataUrl);

      // 2) DB 挿入
      const insert = {
        owner_id: userRes.user.id,
        title: title || 'Title',
        description: description || null,
        img_url: imgUrl,
        pack_id: packId && packId !== 'unsorted' ? packId : null,
        rarity,
      };
      const { error } = await supabase.from('user_cards').insert(insert as any);
      if (error) throw new Error(error.message ?? JSON.stringify(error));

      clearPendingCard();
      Alert.alert('保存しました');

      // ★ RootLayout マウント後に遷移（ここが今回の修正ポイント）
      InteractionManager.runAfterInteractions(() => {
        router.replace('/(tabs)/mycards');
      });
    } catch (e: any) {
      console.error('[save error]', e);
      Alert.alert('保存に失敗しました', e?.message ?? 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const createFolder = async () => {
    if (!newName.trim()) return;
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) { Alert.alert('ログインが必要です'); return; }
    try {
      const { error } = await supabase
        .from('pack_series')
        .insert({ name: newName.trim(), owner_id: userRes.user.id });
      if (error) throw new Error(error.message ?? JSON.stringify(error));
      setNewName(''); setCreating(false);
      const { data } = await supabase
        .from('pack_series').select('id,name').eq('owner_id', userRes.user.id).order('created_at', { ascending: true });
      setSeries((data ?? []) as Series[]);
    } catch (e: any) {
      Alert.alert('作成に失敗', e?.message ?? 'Unknown error');
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={styles.title}>details</Text>

          {previewSrc ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: previewSrc }} style={styles.preview} contentFit="contain" />
            </View>
          ) : null}

          <TextInput
            mode="outlined"
            label="タイトル"
            value={title}
            onChangeText={setTitle}
            style={{ marginHorizontal: 16, marginTop: 12 }}
          />

          <TextInput
            mode="outlined"
            label="説明（任意）"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ marginHorizontal: 16, marginTop: 12 }}
          />

          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <Text style={styles.label}>Rarity *</Text>
            <View style={styles.segmentRow}>
              {(['C','R','SR','UR'] as Rarity[]).map(r => (
                <Button
                  key={r}
                  mode={rarity === r ? 'contained' : 'outlined'}
                  onPress={() => setRarity(r)}
                  style={[styles.segmentBtn, rarity === r && { backgroundColor: rarityColor(r) }]}
                  textColor={rarity === r ? '#000' : '#ccc'}
                >
                  {r}
                </Button>
              ))}
            </View>
          </View>

          <View style={{ marginHorizontal: 16, marginTop: 16 }}>
            <Text style={styles.label}>フォルダー</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Button mode="outlined" onPress={() => setPickerOpen(true)} style={{ borderRadius: 22 }}>
                {packId && packId !== 'unsorted'
                  ? (series.find(s => s.id === packId)?.name ?? '選択')
                  : 'テスト'}
              </Button>
              <Button mode="contained" onPress={() => setCreating(true)} style={{ borderRadius: 22, backgroundColor: '#6b4fd3' }}>
                新規
              </Button>
            </View>
          </View>

          <View style={styles.actions}>
            <Button mode="outlined" onPress={() => router.back()} style={styles.btnGhost}>Back</Button>
            <Button mode="contained" onPress={onSave} disabled={saving || !rarity} style={styles.btnPrimary}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </View>
        </ScrollView>

        {/* フォルダー選択 */}
        <Portal>
          <Dialog visible={pickerOpen} onDismiss={() => setPickerOpen(false)}>
            <Dialog.Title>フォルダーを選択</Dialog.Title>
            <Dialog.Content>
              <RadioButton.Group
                onValueChange={(v) => setPackId(v as any)}
                value={packId ?? 'unsorted'}
              >
                <RadioButton.Item label="未分類" value="unsorted" />
                {series.map(s => (
                  <RadioButton.Item key={s.id} label={s.name} value={s.id} />
                ))}
              </RadioButton.Group>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setPickerOpen(false)}>OK</Button>
            </Dialog.Actions>
          </Dialog>

          {/* 新規フォルダー作成 */}
          <Dialog visible={creating} onDismiss={() => setCreating(false)}>
            <Dialog.Title>新規フォルダー</Dialog.Title>
            <Dialog.Content>
              <TextInput mode="outlined" placeholder="シリーズ名" value={newName} onChangeText={setNewName} />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCreating(false)}>キャンセル</Button>
              <Button onPress={createFolder}>作成</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {saving && (
          <View style={styles.savingMask}>
            <ActivityIndicator size="large" />
          </View>
        )}
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8, marginHorizontal: 16 },
  label: { color: '#aaa', marginBottom: 6 },
  previewWrap: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  preview: { width: '100%', height: undefined, aspectRatio: 3 / 4, backgroundColor: '#111' },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: { borderRadius: 22, flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 24 },
  btnPrimary: { borderRadius: 22, backgroundColor: '#6b4fd3', minWidth: 120 },
  btnGhost: { borderRadius: 22, minWidth: 120 },
  savingMask: { ...StyleSheet.absoluteFillObject as any, backgroundColor: 'rgba(0,0,0,0.4)', alignItems:'center', justifyContent:'center' },
});
