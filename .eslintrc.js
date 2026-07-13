// Configuration ESLint — s'appuie sur la config officielle Expo, en désactivant
// les règles de mise en forme qui entreraient en conflit avec Prettier.
module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'coverage/'],
};
