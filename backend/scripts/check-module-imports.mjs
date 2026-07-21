#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_SRC = join(__dirname, '../src');

const CRITICAL_MODULES = [
  'services/integrations/email/brevo.provider.js',
  'services/integrations/email/email-provider-registry.js',
  'services/integrations/email/index.js',
  'services/automation/email-campaign.service.js',
  'services/execution/email-campaign.service.js',
  'controllers/email-workflow.controller.js',
  'routes/email-workflow.routes.js',
];

let errors = [];
let checkedModules = new Set();

function getAllJsFiles(dir, baseDir = dir) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...getAllJsFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractImports(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const imports = [];
  
  const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*)\s+as\s+\w+|(?:\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

function resolveImportPath(importPath, currentFile) {
  const currentDir = dirname(currentFile);
  
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const resolved = join(currentDir, importPath);
    if (!resolved.endsWith('.js')) {
      return resolved + '.js';
    }
    return resolved;
  } else if (importPath.startsWith('/')) {
    return join(BACKEND_SRC, importPath.slice(1));
  } else {
    return null;
  }
}

async function validateModule(filePath) {
  if (checkedModules.has(filePath)) return;
  checkedModules.add(filePath);
  
  try {
    const imports = extractImports(filePath);
    
    for (const imp of imports) {
      const resolvedPath = resolveImportPath(imp, filePath);
      
      if (resolvedPath && resolvedPath.startsWith(BACKEND_SRC)) {
        try {
          statSync(resolvedPath);
        } catch (e) {
          const relPath = relative(BACKEND_SRC, filePath);
          const relImport = relative(BACKEND_SRC, resolvedPath);
          errors.push(`[ERR_MODULE_NOT_FOUND] ${relPath} imports non-existent module: ${relImport}`);
          continue;
        }
        
        await validateModule(resolvedPath);
      }
    }
    
    const relPath = relative(BACKEND_SRC, filePath);
    if (CRITICAL_MODULES.some(m => filePath.endsWith(m))) {
      try {
        const moduleUrl = `file:///${filePath.replace(/\\/g, '/')}`;
        await import(moduleUrl);
      } catch (e) {
        errors.push(`[IMPORT_ERROR] ${relPath}: ${e.message}`);
      }
    }
  } catch (e) {
    const relPath = relative(BACKEND_SRC, filePath);
    errors.push(`[VALIDATION_ERROR] ${relPath}: ${e.message}`);
  }
}

async function main() {
  console.log('Starting module import validation...\n');
  
  const allFiles = getAllJsFiles(BACKEND_SRC);
  console.log(`Found ${allFiles.length} JavaScript files\n`);
  
  console.log('Validating critical modules...');
  for (const critical of CRITICAL_MODULES) {
    const fullPath = join(BACKEND_SRC, critical);
    if (statSync(fullPath)) {
      await validateModule(fullPath);
    }
  }
  
  console.log('Validating all modules...');
  for (const file of allFiles) {
    await validateModule(file);
  }
  
  console.log('\nValidation Results:');
  console.log(`- Modules checked: ${checkedModules.size}`);
  console.log(`- Errors found: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\nERRORS:\n');
    errors.forEach(err => console.log(`  ${err}`));
    process.exit(1);
  } else {
    console.log('\nAll imports validated successfully!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
