import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
      '**/test-output',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:contracts',
                'scope:events',
                'scope:db',
                'scope:infra',
                'scope:api-dto'
              ],
            },
            {
              sourceTag: 'scope:client',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:contracts',
                'scope:api-client',
                'scope:api-dto',
                'scope:ui'
              ],
            },
            {
              sourceTag: 'scope:backoffice',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:contracts',
                'scope:api-client',
                'scope:api-dto',
                'scope:ui'
              ],
            },
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:contracts'],
            },
            {
              sourceTag: 'scope:events',
              onlyDependOnLibsWithTags: ['scope:contracts'],
            },
            {
              sourceTag: 'scope:db',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            {
              sourceTag: 'scope:contracts',
              onlyDependOnLibsWithTags: [],
            },
            {
              sourceTag: 'scope:infra',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:contracts'],
            },
            {
              sourceTag: 'type:generated',
              bannedExternalImports: ['*'],
              onlyDependOnLibsWithTags: ['scope:contracts'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {},
  },
];
