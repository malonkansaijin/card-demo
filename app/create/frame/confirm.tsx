import React from 'react';
import { SafeAreaView, View, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button, Provider as PaperProvider } from 'react-native-paper';
import { Image } from 'expo-image';

const FRAMES = [
  require('../../../assets/frames/frame1.png'),
  require('../../../assets/frames/frame2.png'),
];

export default function FrameConfirm() {
  const { frame } = useLocalSearchParams<{ frame?: string }>();
  const idx = Math.max(0, Math.min(FRAMES.length - 1, Number(frame ?? 0)));

  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>このフレームでOK？</Text>
        <View style={styles.previewWrap}>
          <Image source={FRAMES[idx]} style={styles.preview} contentFit="contain" transition={200} />
        </View>
        <View style={styles.bottomBar}>
          <Button mode="contained" onPress={() => router.back()} style={[styles.btn, styles.btnSecondary]}>
            Back
          </Button>
          <Button
            mode="contained"
            onPress={() => router.push({ pathname: '/create/editor', params: { frame: String(idx) } })}
            style={styles.btn}
          >
            OK
          </Button>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  previewWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '92%', aspectRatio: 640 / 960, borderRadius: 18, borderWidth: 1, borderColor: '#2a2a2a' },
  bottomBar: { flexDirection: 'row', gap: 12, paddingBottom: 16, paddingTop: 8 },
  btn: { flex: 1, borderRadius: 28, backgroundColor: '#6b4fd3' },
  btnSecondary: { backgroundColor: '#3b3b3b' },
});
