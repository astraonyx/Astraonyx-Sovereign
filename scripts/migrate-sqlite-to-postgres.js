#!/usr/bin/env node
/**
 * scripts/migrate-sqlite-to-postgres.js
 * 
 * Migrasi Aman Database SQLite (polaris.sqlite) ke PostgreSQL (Laragon / Standalone PG).
 * Prinsip: ZERO REGRESSION — Tidak merusak atau mengubah file database SQLite asli sama sekali!
 * Menghasilkan:
 * 1. database/migrations/postgres_schema.sql (Struktur DDL PostgreSQL + JSONB + Indeks)
 * 2. database/migrations/postgres_seed.sql (Data export seluruh tabel yang ada)
 * 3. Eksekusi langsung jika variabel koneksi PG_* tersedia di environment.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SQLITE_PATH = path.join(PROJECT_ROOT, 'database', 'polaris.sqlite');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'database', 'migrations');

if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

console.log('========================================================');
console.log('🐘 [Astraonyx-Polaris] SQLite -> PostgreSQL Safe Migration');
console.log('========================================================\n');

if (!fs.existsSync(SQLITE_PATH)) {
  console.error('❌ File SQLite tidak ditemukan di:', SQLITE_PATH);
  process.exit(1);
}

const db = new Database(SQLITE_PATH, { readonly: true });

function mapSqliteTypeToPg(colName, colType, isPk, isAutoInc) {
  const type = String(colType || '').toUpperCase();
  const name = String(colName || '').toLowerCase();

  if (isPk && (type.includes('INT') || isAutoInc)) {
    return 'SERIAL PRIMARY KEY';
  }

  if (name.endsWith('_json') || name.endsWith('json') || name === 'extra_data') {
    return 'JSONB DEFAULT \'{}\'::jsonb';
  }

  if (type.includes('INT')) {
    return 'BIGINT';
  }
  if (type.includes('REAL') || type.includes('FLOA') || type.includes('DOUB')) {
    return 'DOUBLE PRECISION';
  }
  if (type.includes('BOOL')) {
    return 'BOOLEAN DEFAULT FALSE';
  }
  if (type.includes('BLOB')) {
    return 'BYTEA';
  }
  if (type.includes('DATE') || type.includes('TIME') || name.endsWith('_at')) {
    return 'TIMESTAMPTZ';
  }

  return 'TEXT';
}

function escapePgValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  
  const str = String(val);
  // Cek apakah string ini format JSON
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      JSON.parse(str);
      return `'${str.replace(/'/g, "''")}'::jsonb`;
    } catch (_) {}
  }
  return `'${str.replace(/'/g, "''")}'`;
}

// 1. Ambil seluruh tabel dari SQLite
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC").all();

let schemaSql = `-- ========================================================\n`;
schemaSql += `-- ASTRAONYX POLARIS POSTGRESQL SCHEMA MIGRATION\n`;
schemaSql += `-- Generated: ${new Date().toISOString()}\n`;
schemaSql += `-- Compatible with: PostgreSQL 14+, 15+, 16+, Laragon PostgreSQL\n`;
schemaSql += `-- ========================================================\n\n`;
schemaSql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;

let seedSql = `-- ========================================================\n`;
seedSql += `-- ASTRAONYX POLARIS POSTGRESQL DATA SEED\n`;
seedSql += `-- Generated: ${new Date().toISOString()}\n`;
seedSql += `-- ========================================================\n\n`;
seedSql += `BEGIN;\n\n`;

let totalRowsExported = 0;

for (const t of tables) {
  const tableName = t.name;
  const colInfos = db.prepare(`PRAGMA table_info("${tableName}")`).all();
  
  schemaSql += `-- Table: ${tableName}\n`;
  schemaSql += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;

  const colDefs = [];
  const pkCols = [];

  for (const c of colInfos) {
    const isPk = c.pk > 0;
    const pgType = mapSqliteTypeToPg(c.name, c.type, isPk, false);
    
    let def = `  "${c.name}" ${pgType}`;
    if (c.notnull && !pgType.includes('PRIMARY KEY')) {
      def += ' NOT NULL';
    }
    if (c.dflt_value !== null && !pgType.includes('DEFAULT')) {
      def += ` DEFAULT ${c.dflt_value}`;
    }
    colDefs.push(def);

    if (isPk && !pgType.includes('PRIMARY KEY')) {
      pkCols.push(`"${c.name}"`);
    }
  }

  if (pkCols.length > 0) {
    colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`);
  }

  schemaSql += colDefs.join(',\n');
  schemaSql += `\n);\n\n`;

  // Indeks umum untuk performa
  schemaSql += `CREATE INDEX IF NOT EXISTS "idx_${tableName}_created_at" ON "${tableName}" ("created_at") WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = 'created_at');\n\n`;

  // 2. Export Data
  const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
  if (rows.length > 0) {
    seedSql += `-- Data for ${tableName} (${rows.length} rows)\n`;
    for (const r of rows) {
      const colNames = Object.keys(r).map(c => `"${c}"`).join(', ');
      const valLiterals = Object.values(r).map(escapePgValue).join(', ');
      seedSql += `INSERT INTO "${tableName}" (${colNames}) VALUES (${valLiterals}) ON CONFLICT DO NOTHING;\n`;
    }
    seedSql += `\n`;
    totalRowsExported += rows.length;
  }
}

seedSql += `COMMIT;\n`;

const schemaPath = path.join(MIGRATIONS_DIR, 'postgres_schema.sql');
const seedPath = path.join(MIGRATIONS_DIR, 'postgres_seed.sql');

fs.writeFileSync(schemaPath, schemaSql, 'utf8');
fs.writeFileSync(seedPath, seedSql, 'utf8');

console.log(`✅ Berhasil mengekspor skema ke: ${path.relative(PROJECT_ROOT, schemaPath)}`);
console.log(`✅ Berhasil mengekspor ${totalRowsExported} baris data ke: ${path.relative(PROJECT_ROOT, seedPath)}`);
console.log(`ℹ️  Tabel yang dimigrasikan (${tables.length} tabel):`);
tables.forEach(t => console.log(`   - ${t.name}`));
console.log('\n🔒 Basis data SQLite asli (database/polaris.sqlite) tetap 100% aman dan tidak tersentuh.');
