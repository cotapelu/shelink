const fs = require('fs');
const path = 'src/utils/gedcom.ts';
const content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('function buildPersonRecord(');
if (startIdx === -1) {
  console.error('Could not find buildPersonRecord');
  process.exit(1);
}

// Find the start of the next function: buildFamilySection
const endIdx = content.indexOf('function buildFamilySection(', startIdx);
if (endIdx === -1) {
  console.error('Could not find buildFamilySection after buildPersonRecord');
  process.exit(1);
}

const before = content.slice(0, startIdx);
const after = content.slice(endIdx);
const newBlock = fs.readFileSync('scripts/buildpersonrecord-new-block.txt', 'utf8');

fs.writeFileSync(path, before + newBlock + after);
console.log('Refactored buildPersonRecord successfully.');
