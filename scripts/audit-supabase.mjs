import { readFile } from 'node:fs/promises';

const envText = await readFile(new URL('../.env', import.meta.url), 'utf8').catch(() => '');
const fileEnv = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.match(/^([A-Z0-9_]+)=(?:"([^"]*)"|'([^']*)'|(.*))$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2] ?? match[3] ?? match[4] ?? '']),
);

const supabaseUrl = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
}

const typesText = await readFile(
  new URL('../src/integrations/supabase/types.ts', import.meta.url),
  'utf8',
);
const expected = new Map();
const tablePattern =
  /^      ([A-Za-z0-9_]+): \{\n        Row: \{\n([\s\S]*?)^        \}\n        Insert:/gm;

for (const match of typesText.matchAll(tablePattern)) {
  const columns = [...match[2].matchAll(/^          ([A-Za-z0-9_]+):/gm)].map(
    (columnMatch) => columnMatch[1],
  );
  expected.set(match[1], new Set(columns));
}

const restUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1`;
const headers = {
  apikey: publishableKey,
};
const response = await fetch(`${restUrl}/`, {
  headers: {
    accept: 'application/openapi+json',
    ...headers,
  },
});

const remote = new Map();
let exactRemoteSchema = false;

if (response.ok) {
  const openApi = await response.json();
  const definitions = openApi.definitions || openApi.components?.schemas || {};
  for (const [name, definition] of Object.entries(definitions)) {
    if (definition && typeof definition === 'object' && definition.properties) {
      remote.set(name, new Set(Object.keys(definition.properties)));
    }
  }
  exactRemoteSchema = true;
} else if (response.status === 401 || response.status === 403) {
  // New Supabase publishable keys cannot download OpenAPI metadata. Validate
  // every expected table and expected column directly through PostgREST.
  const checks = [...expected].map(async ([table, columns]) => {
    const select = [...columns].join(',');
    const tableResponse = await fetch(
      `${restUrl}/${encodeURIComponent(table)}?select=${encodeURIComponent(select)}&limit=0`,
      { headers },
    );
    if (tableResponse.ok) return [table, columns];

    const error = await tableResponse.json().catch(() => ({}));
    if (error.code === 'PGRST205' || tableResponse.status === 404) return [table, null];

    const columnChecks = await Promise.all(
      [...columns].map(async (column) => {
        const columnResponse = await fetch(
          `${restUrl}/${encodeURIComponent(table)}?select=${encodeURIComponent(column)}&limit=0`,
          { headers },
        );
        return [column, columnResponse.ok];
      }),
    );
    return [table, new Set(columnChecks.filter(([, exists]) => exists).map(([column]) => column))];
  });

  for (const [table, columns] of await Promise.all(checks)) {
    if (columns) remote.set(table, columns);
  }
} else {
  throw new Error(`Supabase schema request failed (${response.status}): ${await response.text()}`);
}

const missingTables = [...expected.keys()].filter((name) => !remote.has(name)).sort();
const extraTables = exactRemoteSchema
  ? [...remote.keys()].filter((name) => !expected.has(name)).sort()
  : [];
const columnMismatches = [];

for (const [table, expectedColumns] of expected) {
  const remoteColumns = remote.get(table);
  if (!remoteColumns) continue;
  const missing = [...expectedColumns].filter((column) => !remoteColumns.has(column)).sort();
  const extra = [...remoteColumns].filter((column) => !expectedColumns.has(column)).sort();
  if (missing.length || extra.length) columnMismatches.push({ table, missing, extra });
}

const report = {
  projectUrl: supabaseUrl,
  expectedTableCount: expected.size,
  remoteTableCount: remote.size,
  matchedTableCount: [...expected.keys()].filter((name) => remote.has(name)).length,
  missingTables,
  extraTables,
  columnMismatches,
  exactRemoteSchema,
  note: exactRemoteSchema
    ? 'Tables and columns were compared using Supabase OpenAPI metadata.'
    : 'The publishable key permits validation of every expected table and column, but listing unexpected extra remote columns requires a Supabase secret key.',
  schemaMatches:
    missingTables.length === 0 && extraTables.length === 0 && columnMismatches.length === 0,
};

console.log(JSON.stringify(report, null, 2));
if (!report.schemaMatches) process.exitCode = 1;
