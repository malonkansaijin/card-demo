/* app/create/editor.tsx
   ------------------------------------------------------------
   Fabric.js でカード合成 → PNG を Supabase Storage → cards へ INSERT
   ★ WebView 内部ログ (LOG:/ERR:) を Metro に流すデバッグ版
----------------------------------------------------------------*/
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useRef, useEffect, useState } from 'react';
import { View, Alert, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, router } from 'expo-router';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import {
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
} from '@env';

/* フレーム PNG アセット */
const framePngs = [
  require('../../assets/frames/frame1.png'),
  require('../../assets/frames/frame2.png'),
];

/* Supabase */
const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export default function Editor() {
  /* ルートパラメータ */
  const { photo: rawPhoto, frame: rawFrame } =
    useLocalSearchParams<{ photo: string; frame: string }>();

  const photoDataUrl = typeof rawPhoto === 'string' ? rawPhoto : '';
  const frameIdx     = Number(rawFrame ?? 0);

  /* Base64 化したフレーム */
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [webLoaded, setWebLoaded]       = useState(false);
  const webRef = useRef<WebView>(null);

  /* フレーム PNG → Base64 */
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(
        framePngs[frameIdx in framePngs ? frameIdx : 0]
      );
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri!, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setFrameDataUrl(`data:image/png;base64,${base64}`);
    })();
  }, [frameIdx]);

  /* WebView がロード済み & frameBase64 が取れたら postMessage */
  useEffect(() => {
    if (webLoaded && frameDataUrl) {
      webRef.current?.postMessage(
        JSON.stringify({ photo: photoDataUrl, frame: frameDataUrl })
      );
    }
  }, [webLoaded, frameDataUrl]);

  /* WebView → RN */
  async function onMessage(e: any) {
    const msg: string = e.nativeEvent.data;

    /* --- デバッグログを表示 --- */
    if (msg.startsWith('LOG:') || msg.startsWith('ERR:')) {
      console.log('[WebView]', msg);
      return;
    }

    /* --- PNG データ受信フロー --- */
    try {
      const blob   = await (await fetch(msg)).blob();
      const file   = `card_${uuid()}.png`;
      const { data, error } = await supabase
        .storage
        .from('user-cards')
        .upload(file, blob, { contentType: 'image/png', upsert: false });
      if (error) throw error;

      const { publicUrl } = supabase.storage
        .from('user-cards')
        .getPublicUrl(data.path).data;

      await supabase.from('cards').insert({
        img_url: publicUrl,
        title:   'Untitled',
        rarity:  'C',
        set_id:  1,
      });

      Alert.alert('✅ 保存完了', 'カードを保存しました');
      router.replace('/(tabs)/collection');
    } catch (err: any) {
      Alert.alert('Upload error', err.message ?? String(err));
    }
  }

  /* 軽量 HTML ＋ デバッグログ */
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/6.0.0/fabric.min.js"></script>
<style>html,body{margin:0;height:100%;background:#000;display:flex;justify-content:center;align-items:center}</style>
</head><body>
<canvas id="c" width="640" height="960"></canvas>
<script>
  /* --- デバッグ関数 --- */
  function log(m){ window.ReactNativeWebView.postMessage('LOG:'+m); }
  window.onerror = (m)=>window.ReactNativeWebView.postMessage('ERR:'+m);
  log('HTML loaded');

  const canvas=new fabric.Canvas('c',{backgroundColor:'#fff'});
  log('Fabric ready');

  document.addEventListener('message',e=>{
    const {photo,frame}=JSON.parse(e.data); log('init msg'); init(photo,frame);
  });

  function init(photoUrl,frameUrl){
    fabric.Image.fromURL(photoUrl,img=>{
      log('photo loaded');
      img.scale(640/img.width); canvas.centerObject(img); canvas.add(img);
      fabric.Image.fromURL(frameUrl,f=>{
        log('frame loaded');
        f.scaleToWidth(640); f.selectable=false; canvas.add(f);
        canvas.moveTo(f,canvas._objects.length-1);
      });
      canvas.add(new fabric.Textbox('Title',{width:600,top:700,fill:'#fff',fontSize:60,textAlign:'center'}));
    }, ()=>log('ERR:photo load fail'));
  }

  function save(){
    canvas.discardActiveObject();
    window.ReactNativeWebView.postMessage(canvas.toDataURL({format:'png',quality:1}));
  }
  canvas.on('touch:gesture',e=>{if(e.e.touches.length===2)save();});
  window.addEventListener('keydown',e=>{if(e.key==='s'||e.key==='S')save();});
</script></body></html>`;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => setWebLoaded(true)}
        onMessage={onMessage}
        javaScriptEnabled
        mixedContentMode="always"
        scrollEnabled={false}
      />
    </View>
  );
}
