/* app/create/editor.tsx
   ------------------------------------------------------------
   ✨ 改良点
   1. 画像ハンドル完全非表示
      - img.setControlsVisibility({...false}) + hasBorders:false で丸ハンドルを消去
   2. 回転スライダー UI 追加
      - <input type="range" id="rot" min="-45" max="45"> を Canvas の下に配置
      - スライダー操作で img.rotate() しリアルタイム反映
   3. ピンチ拡大・ドラッグ移動はそのまま維持
   ------------------------------------------------------------*/
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import React, { useRef, useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
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

const framePngs = [
  require('../../assets/frames/frame1.png'),
  require('../../assets/frames/frame2.png'),
];

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export default function Editor() {
  const { photo: rawPhoto, frame: rawFrame } =
    useLocalSearchParams<{ photo: string; frame: string }>();

  const photoDataUrl = typeof rawPhoto === 'string' ? rawPhoto : '';
  const frameIdx = Number(rawFrame ?? 0);

  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [webLoaded, setWebLoaded] = useState(false);
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(framePngs[frameIdx] ?? framePngs[0]);
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri!, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setFrameDataUrl(`data:image/png;base64,${base64}`);
    })();
  }, [frameIdx]);

  useEffect(() => {
    if (webLoaded && frameDataUrl) {
      webRef.current?.postMessage(
        JSON.stringify({ photo: photoDataUrl, frame: frameDataUrl })
      );
    }
  }, [webLoaded, frameDataUrl]);

  async function onMessage(e: any) {
    const msg: string = e.nativeEvent.data;
    if (msg.startsWith('LOG:') || msg.startsWith('ERR:')) {
      console[msg.startsWith('LOG:') ? 'log' : 'error']('[WebView]', msg);
      if (msg.startsWith('ERR:')) Alert.alert('WebView Error', msg.replace('ERR:', ''));
      return;
    }
    try {
      const fileName = `${uuid()}.png`;
      const base64 = msg.replace(/^data:image\/png;base64,/, '');
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await supabase.storage
        .from('user-cards')
        .upload(fileName, await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 }), {
          contentType: 'image/png', upsert: true,
        });
      if (error) throw error;
      await supabase.from('cards').insert({
        id: uuid(),
        owner_id: (await supabase.auth.getUser()).data.user?.id ?? null,
        filename: data?.path,
        frame_idx: frameIdx,
        created_at: new Date().toISOString(),
      });
      Alert.alert('保存しました ✨');
      router.replace('/collection');
    } catch (err: any) {
      Alert.alert('保存エラー', err.message);
    }
  }

  const html = `<!DOCTYPE html><html><head><meta charset='utf-8'>
  <script src='https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js'></script>
  <style>
    html,body{margin:0;height:100%;background:#000;display:flex;flex-direction:column;justify-content:center;align-items:center}
    #rot{width:300px;margin-top:12px}
  </style>
  </head><body>
  <canvas id='c' width='640' height='960'></canvas>
  <input id='rot' type='range' min='-45' max='45' step='1' value='0'>
  <script>
    const RN=window.ReactNativeWebView;
    const log=m=>RN.postMessage('LOG:'+m);
    const err=m=>RN.postMessage('ERR:'+m);
    window.onerror=m=>err(m);

    let canvas,img,frame,textbox;

    function initCanvas(){
      canvas=new fabric.Canvas('c',{backgroundColor:'#fff',preserveObjectStacking:true,selection:false});
      log('Fabric ready');
    }
    (function wait(){ if(window.fabric){initCanvas();} else setTimeout(wait,50);})();

    document.addEventListener('message',e=>{
      const {photo,frame:frameUrl}=JSON.parse(e.data);
      setup(photo,frameUrl);
    });

    function keepFrameTop(){ if(frame) canvas.bringToFront(frame); }

    function setup(photoUrl,frameUrl){
      if(!canvas)return;
      fabric.Image.fromURL(photoUrl,(image)=>{
        img=image;
        img.set({
          selectable:true,
          hasControls:false,
          hasBorders:false,
          lockRotation:true
        });
        img.setControlsVisibility({bl:false,br:false,tl:false,tr:false,ml:false,mt:false,mr:false,mb:false,mtr:false});
        img.scale(640/img.width);
        canvas.centerObject(img);
        canvas.add(img);

        /* --- ピンチスケール --- */
        let startDist=0,startScale=1;
        const uc=canvas.upperCanvasEl;
        function dist(t){const[a,b]=t;return Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);}        
        uc.addEventListener('touchstart',ev=>{
          if(ev.touches.length===2){startDist=dist(ev.touches);startScale=img.scaleX;}
        });
        uc.addEventListener('touchmove',ev=>{
          if(ev.touches.length===2){
            const ratio=dist(ev.touches)/startDist;
            img.scale(startScale*ratio);
            img.setCoords();
            keepFrameTop();
            canvas.requestRenderAll();
          }
        });

        /* --- 回転スライダー --- */
        const rot=document.getElementById('rot');
        rot.addEventListener('input',ev=>{
          const ang=parseInt(ev.target.value,10);
          img.rotate(ang);
          img.setCoords();
          keepFrameTop();
          canvas.requestRenderAll();
        });

        fabric.Image.fromURL(frameUrl,(f)=>{
          frame=f;
          frame.scaleToWidth(640);
          frame.selectable=false;
          canvas.add(frame);
          keepFrameTop();
        },{crossOrigin:'anonymous'});

        textbox=new fabric.Textbox('Title',{width:600,top:700,fill:'#fff',fontSize:60,textAlign:'center',editable:true});
        canvas.add(textbox);
        keepFrameTop();
      },()=>err('photo load fail'));
    }

    function save(){keepFrameTop();canvas.discardActiveObject();RN.postMessage(canvas.toDataURL({format:'png',quality:1}));}
  </script></body></html>`;

  return (
    <View style={{flex:1}}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onLoadEnd={() => setWebLoaded(true)}
        onMessage={onMessage}
        javaScriptEnabled
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode='always'
      />
    </View>
  );
}
