#!/usr/bin/env node

/**
 * Model Configuration Audit
 * Checks for hardcoded model names and inconsistencies across files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'src');

const modelPatterns = [
  { name: 'GROQ_MODEL', env: 'GROQ_MODEL', defaults: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile'] },
  { name: 'GEMINI_MODEL', env: 'GEMINI_MODEL', defaults: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] },
  { name: 'OPENROUTER_MODEL', env: 'OPENROUTER_MODEL', defaults: ['qwen-7b-chat', 'anthropic/claude-3-haiku', 'openai/gpt-4o-mini'] },
  { name: 'OPENAI_MODEL', env: 'OPENAI_MODEL', defaults: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'] },
];

function searchFiles(dir, pattern) {
  const results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    if (file.isDirectory() && !file.name.startsWith('node_modules') && !file.name.startsWith('.')) {
      results.push(...searchFiles(path.join(dir, file.name), pattern));
    } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
      const filePath = path.join(dir, file.name);
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.matchAll(new RegExp(pattern, 'g'));
      for (const match of matches) {
        const lines = content.split('\n');
        const lineNum = lines.findIndex((line, i) => line.includes(match[0])) + 1;
        results.push({
          file: filePath.replace(srcDir, 'src'),
          line: lineNum,
          match: match[0],
        });
      }
    }
  }
  
  return results;
}

console.log('============================================================');
console.log('MODEL CONFIGURATION AUDIT');
console.log('============================================================\n');

const audit = {};

for (const model of modelPatterns) {
  console.log(`\n--- ${model.name} ---`);
  const pattern = `${model.name}\\s*=\\s*["']([^"']+)["']|process\\.env\\.${model.name}\\s*\\|\\|\\s*["']([^"']+)["']`;
  const results = searchFiles(srcDir, pattern);
  
  const uniqueDefaults = new Set();
  const fileUsages = {};
  
  for (const result of results) {
    const match = result.match.match(/["']([^"']+)["']/);
    if (match) {
      const modelValue = match[1];
      uniqueDefaults.add(modelValue);
      if (!fileUsages[result.file]) {
        fileUsages[result.file] = [];
      }
      fileUsages[result.file].push({ line: result.line, model: modelValue });
    }
  }
  
  console.log(`Environment Variable: ${model.env}`);
  console.log(`Files using ${model.name}: ${results.length}`);
  console.log(`Unique default values found: ${Array.from(uniqueDefaults).join(', ')}`);
  
  if (Object.keys(fileUsages).length > 0) {
    console.log('\nFile usage:');
    for (const [file, usages] of Object.entries(fileUsages)) {
      console.log(`  ${file}:`);
      for (const usage of usages) {
        console.log(`    Line ${usage.line}: "${usage.model}"`);
      }
    }
  }
  
  audit[model.name] = {
    env: model.env,
    fileCount: results.length,
    uniqueDefaults: Array.from(uniqueDefaults),
    fileUsages,
  };
}

console.log('\n============================================================');
console.log('INCONSISTENCIES DETECTED');
console.log('============================================================');

for (const model of modelPatterns) {
  const data = audit[model.name];
  if (data.uniqueDefaults.length > 1) {
    console.log(`\n⚠️  ${model.name} has inconsistent defaults:`);
    console.log(`   Expected: ${data.uniqueDefaults[0]}`);
    console.log(`   Found: ${data.uniqueDefaults.join(', ')}`);
  }
}

console.log('\n============================================================');
console.log('RECOMMENDED ACTIONS');
console.log('============================================================');
console.log('\n1. Standardize model defaults across all files');
console.log('2. Use environment variables for all models');
console.log('3. Document model choices in .env.example');
console.log('4. Update deprecated models to current versions');
console.log('\nRecommended defaults:');
console.log('  GROQ_MODEL=llama-3.3-70b-versatile');
console.log('  GEMINI_MODEL=gemini-2.0-flash');
console.log('  OPENROUTER_MODEL=anthropic/claude-3-haiku');
console.log('  OPENAI_MODEL=gpt-4o-mini');
