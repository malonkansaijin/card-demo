import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/home" />; // 即座に /home にリダイレクト
}