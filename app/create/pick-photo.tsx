/* app/create/pick-photo.tsx
   -----------------------------------------------------------
   1. 端末のフォトライブラリを開く
   2. 選択した画像を DataURL に変換
   3. /create/editor へ { frame, photo } を渡して遷移
   Expo SDK 52+ 対応版（mediaTypes は文字列配列で指定）
*/
import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ActivityIndicator, View } from 'react-native';

export default function PickPhoto() {
  /* フレーム index (文字列) をクエリから取得 */
  const { frame } = useLocalSearchParams<{ frame: string }>();

  useEffect(() => {
    (async () => {
      /* --- 権限チェック（必須） --- */
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('写真ライブラリへのアクセス権がありません');
        router.back();
        return;
      }

      /* --- 画像ピッカーを起動 --- */
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // SDK 52+: 文字列配列で指定
        quality: 1,
        base64: true,          // DataURL 化のため base64 を付与
      });

      /* キャンセルなら前画面へ戻る */
      if (result.canceled || !result.assets?.length) {
        router.back();
        return;
      }

      /* 1 枚目の画像を DataURL へ変換 */
      const asset   = result.assets[0];
      const mime    = asset.mimeType ?? 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;

      /* ---------- エディタ画面へ遷移 ---------- */
      router.push({
        pathname: '/create/editor',
        params: {
          frame,          // 選んだフレーム番号
          photo: dataUrl, // DataURL 文字列
        },
      });
    })();
  }, []);

  /* 表示要素は不要だが、黒画面防止にローダーを置く */
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
