/* app/create/pick-photo.tsx
   -----------------------------------------------------------
   1. 端末のフォトライブラリを開く
   2. 選択した画像を DataURL に変換
   3. /create/editor へ { frame, photo } を渡して遷移
*/
import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';

export default function PickPhoto() {
  /* フレーム index (文字列) をクエリから取得 */
  const { frame } = useLocalSearchParams<{ frame: string }>();

  useEffect(() => {
    (async () => {
      /* ---------- 写真ピッカーを起動 ---------- */
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.image], // 警告を避ける推奨形式
        quality: 1,
        base64: true,                              // DataURL 化のため必須
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

  /* 表示要素は不要（ピッカーのみ） */
  return null;
}
