const fs = require('fs');
const path = require('path');

const HEADER = `/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */`;

function getAllFiles(dir, extensions, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'dist') {
        continue;
      }
      getAllFiles(fullPath, extensions, fileList);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function addHeaderToFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if already has the header
  if (content.includes('Copyright 2026 COTAPELU')) {
    return { added: false, reason: 'already has header' };
  }

  // Check if it's a TypeScript/JavaScript file with shebang or use directive
  const lines = content.split('\n');
  const prependLines = [HEADER, ...lines];

  const newContent = prependLines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');

  return { added: true };
}

// Main
const srcDir = path.join(process.cwd(), 'src');
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

console.log('🔍 Scanning for source files...');
const files = getAllFiles(srcDir, extensions);

console.log(`📦 Found ${files.length} files.`);

let added = 0;
let skipped = 0;

for (const file of files) {
  try {
    const result = addHeaderToFile(file);
    if (result.added) {
      console.log(`✅  Added header to: ${file}`);
      added++;
    } else {
      console.log(`⏭  Skipped: ${file} (${result.reason})`);
      skipped++;
    }
  } catch (err) {
    console.error(`❌  Error processing ${file}:`, err.message);
  }
}

console.log('');
console.log('==========================================');
console.log(`Summary:`);
console.log(`  Total files scanned: ${files.length}`);
console.log(`  Headers added: ${added}`);
console.log(`  Files skipped: ${skipped}`);
console.log('==========================================');
