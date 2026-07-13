// Configuration Babel pour Expo.
// Le preset "babel-preset-expo" active le support de React Native,
// de TypeScript et d'Expo Router (routage par fichiers).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
