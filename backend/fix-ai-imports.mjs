import fs from 'fs';
import path from 'path';

const srcDir = 'C:\\Users\\sanja\\Downloads\\Test\\backend\\src';
const orchestratorPath = path.join(srcDir, 'domains/ai/services/aiOrchestrator.service.js').replace(/\\/g, '/');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = walkDir(srcDir);
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const lines = content.split('\n');
  const newLines = lines.map(line => {
    if (line.includes('aiRouter.service.js') || line.includes('aiProvider.service.js')) {
      const fileDir = path.dirname(file).replace(/\\/g, '/');
      let relativePath = path.posix.relative(fileDir, orchestratorPath);
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
      
      const res = line.replace(/['"][^'"]*(aiRouter\.service\.js|aiProvider\.service\.js)['"]/, `"${relativePath}"`);
      changed = true;
      return res;
    }
    return line;
  });

  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'));
    console.log(`Updated ${file}`);
    changedCount++;
  }
});

console.log(`Fixed AI imports in ${changedCount} files.`);
