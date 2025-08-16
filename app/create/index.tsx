// app/create/index.tsx
import 'react-native-url-polyfill/auto';
import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { Provider as PaperProvider, Button, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { setCreatePhoto } from '@/lib/createSession';

export default function CreateTop() {
  const [busy, setBusy] = useState(false);

  const pickPhoto = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // 権限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('写真ライブラリへのアクセス許可が必要です');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 1,
        allowsMultipleSelection: false,
      });
      if (res.canceled) return;

      const asset = res.assets[0];
      // base64 が無い環境（稀）に備えてフォールバック
      let dataUrl = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : await uriToDataURL(asset.uri);

      setCreatePhoto(dataUrl);        // ← 一時ストアに保存
      router.push('/create/frame');   // ← ここでは photo を渡さない
    } catch (e: any) {
      alert(e?.message ?? '画像の読み込みに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>トレカ作成</Text>
        <View style={styles.center}>
          <Button mode="contained" style={styles.btnPrimary} onPress={pickPhoto} loading={busy} disabled={busy}>
            Create
          </Button>
          <Button mode="contained" style={styles.btnSecondary} onPress={() => router.push('/create/templates')}>
            Frame Template
          </Button>
          <Button mode="contained" style={styles.btnSecondary} onPress={() => router.replace('/')}>
            Home
          </Button>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

// fetch→blob→FileReader で DataURL 生成（Webフォールバック）
async function uriToDataURL(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return dataUrl;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 18,
  },
  btnPrimary: {
    borderRadius: 28,
    backgroundColor: '#6b4fd3',
    height: 56,
    justifyContent: 'center',
  },
  btnSecondary: {
    borderRadius: 28,
    backgroundColor: '#6b4fd3',
    height: 56,
    justifyContent: 'center',
  },
});
