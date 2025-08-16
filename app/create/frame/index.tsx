import React from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Button, Provider as PaperProvider } from 'react-native-paper';

const FRAMES = [
  require('../../../assets/frames/frame1.png'),
  require('../../../assets/frames/frame2.png'),
];

export default function FrameSelect() {
  const selectFrame = (i: number) => {
    router.push({
      pathname: '/create/frame/confirm',
      params: { frame: String(i) },       // ← photo は渡さない
    });
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>フレームを選択</Text>
        <View style={styles.row}>
          {FRAMES.map((src, i) => (
            <TouchableOpacity key={i} onPress={() => selectFrame(i)} activeOpacity={0.8}>
              <Image source={src} style={styles.frame} contentFit="contain" transition={200} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.bottom}>
          <Button mode="contained" onPress={() => router.replace('/')} style={styles.btn}>
            Home
          </Button>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', paddingHorizontal: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  row: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, flexDirection: 'row' },
  frame: { width: 160, height: 240, borderRadius: 16 },
  bottom: { paddingVertical: 16 },
  btn: { borderRadius: 28, backgroundColor: '#6b4fd3' },
});
