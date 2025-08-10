module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: { '@': './' },
          extensions: ['.tsx', '.ts', '.js', '.json'],
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          allowlist: [
            'EXPO_PUBLIC_SUPABASE_URL',
            'EXPO_PUBLIC_SUPABASE_ANON_KEY',
          ],
        },
      ],
      'expo-router/babel',
    ],
  };
};
