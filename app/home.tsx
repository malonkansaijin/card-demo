// app/home.tsx もしくは app/home/index.tsx
import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { Provider as PaperProvider, Button } from 'react-native-paper';
import { router } from 'expo-router';

export default function HomeMenu() {
  return (
    <PaperProvider>
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Button mode="contained" style={styles.menuBtn} onPress={() => router.push('/(tabs)')}>
            Open Packs
          </Button>

          <Button mode="contained" style={styles.menuBtn} onPress={() => router.push('/(tabs)/collection')}>
            Collection
          </Button>

          <Button mode="contained" style={styles.menuBtn} onPress={() => router.push('/(tabs)/mycards')}>
            My Cards
          </Button>

          <Button mode="contained" style={styles.menuBtn} onPress={() => router.push('/create')}>
            Create Card
          </Button>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 24 },
  menuBtn: {
    width: 300,
    height: 56,
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#6b4fd3',
  },
});
