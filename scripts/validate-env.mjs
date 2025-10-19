#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_VARIABLES = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    description: 'Supabase project URL (https://<project>.supabase.co)',
    validate: (value) => value.startsWith('https://') && value.includes('.supabase.co'),
    errorMessage: 'must be a Supabase HTTPS URL (https://<project>.supabase.co)'
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    description: 'Supabase anon key',
    validate: (value) => value.length > 30,
    errorMessage: 'looks too short; copy the anon key from Supabase → Project Settings → API'
  },
  {
    key: 'NEXT_PUBLIC_SITE_URL',
    description: 'Site URL for redirects and emails',
    validate: (value) => /^https?:\/\//.test(value),
    errorMessage: 'must include http:// or https:// prefix'
  }
];

const OPTIONAL_VARIABLES = [
  'OPENAI_API_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LOG_INGEST_URL',
  'LOG_INGEST_TOKEN',
  'LOG_ENVIRONMENT'
];

const RECOMMENDED_VARIABLES = [
  {
    key: 'SUPABASE_DB_URL',
    description: 'Supabase Postgres connection string',
    validate: (value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
    errorMessage: 'must be a postgres:// connection string'
  }
];

const ENV_FILES = ['.env.local', '.env.development', '.env'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) return acc;
      const key = line.slice(0, equalsIndex).trim();
      let value = line.slice(equalsIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      acc[key] = value;
      return acc;
    }, {});
}

function loadEnv() {
  const env = { ...process.env };
  for (const filename of ENV_FILES) {
    const fullPath = resolve(process.cwd(), filename);
    Object.assign(env, parseEnvFile(fullPath));
  }
  return env;
}

function main() {
  const env = loadEnv();
  const missing = [];
  const invalid = [];

  for (const variable of REQUIRED_VARIABLES) {
    const value = env[variable.key];
    if (!value) {
      missing.push(`${variable.key} (${variable.description})`);
      continue;
    }
    if (variable.validate && !variable.validate(value)) {
      invalid.push(`${variable.key} ${variable.errorMessage}`);
    }
  }

  if (missing.length || invalid.length) {
    console.error('\u274c Environment validation failed.');
    if (missing.length) {
      console.error('\nMissing required variables:');
      for (const item of missing) {
        console.error(`  - ${item}`);
      }
    }
    if (invalid.length) {
      console.error('\nInvalid values detected:');
      for (const item of invalid) {
        console.error(`  - ${item}`);
      }
    }
    console.error('\nCreate or update .env.local based on .env.example before committing.');
    process.exit(1);
  }

  const recommendedIssues = RECOMMENDED_VARIABLES.filter((variable) => {
    const value = env[variable.key];
    return !value || (variable.validate && !variable.validate(value));
  });
  const optionalUnset = OPTIONAL_VARIABLES.filter((key) => !env[key]);
  console.log('\u2705 Environment looks good!');
  if (recommendedIssues.length) {
    console.log('\nRecommended updates:');
    for (const variable of recommendedIssues) {
      if (!env[variable.key]) {
        console.log(`  - ${variable.key} (${variable.description}) is not set.`);
      } else {
        console.log(`  - ${variable.key} ${variable.errorMessage}.`);
      }
    }
  }
  if (optionalUnset.length) {
    console.log('\nThe following optional variables are unset:');
    for (const key of optionalUnset) {
      console.log(`  - ${key}`);
    }
    console.log('Populate them when the corresponding features are ready.');
  }
}

main();
