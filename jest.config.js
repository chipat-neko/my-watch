// =============================================================================
//  Configuration Jest
//  ---------------------------------------------------------------------------
//  On teste la logique MÉTIER PURE (parsing CSV, dates) avec ts-jest en
//  environnement Node : pas besoin de mocker React Native puisque ces modules
//  n'importent que des types. Pour tester des composants RN plus tard, il
//  faudrait basculer sur le preset "jest-expo".
// =============================================================================

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Résout l'alias "@/..." déclaré dans tsconfig.json vers le dossier src/.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
};
