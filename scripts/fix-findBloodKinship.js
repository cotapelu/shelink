const fs = require('fs');
const filePath = 'src/utils/kinshipHelpers.ts';
let content = fs.readFileSync(filePath, 'utf8');

const funcName = 'function findBloodKinship(';
const startIdx = content.indexOf(funcName);
if (startIdx === -1) {
  console.error('findBloodKinship not found');
  process.exit(1);
}

// Find the start of computeKinship export
const nextExport = 'export function computeKinship(';
const endIdx = content.indexOf(nextExport, startIdx);
if (endIdx === -1) {
  console.error('computeKinship not found');
  process.exit(1);
}

// Split
const before = content.slice(0, startIdx);
const after = content.slice(endIdx); // includes any whitespace/comment before computeKinship

const newCode = `
function findLCA(
  ancA: Map<string, any>,
  ancB: Map<string, any>,
): { lcaId: string | null; minDistance: number } {
  let lcaId: string | null = null;
  let minDistance = Infinity;
  for (const [id, dataA] of ancA) {
    if (ancB.has(id)) {
      const dist = dataA.depth + ancB.get(id)!.depth;
      if (dist < minDistance) {
        minDistance = dist;
        lcaId = id;
      }
    }
  }
  return { lcaId, minDistance };
}

function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
): KinshipResult | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap);
  const ancB = getAncestryData(personB.id, parentMap, personsMap);

  const { lcaId, minDistance } = findLCA(ancA, ancB);
  if (!lcaId) return null;

  const dataA = ancA.get(lcaId)!;
  const dataB = ancB.get(lcaId)!;

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
  );

  const lcaName = personsMap.get(lcaId)?.full_name ?? "Tổ tiên chung";
  const pathParts: string[] = [];
  pathParts.push(\`\${personA.full_name} cách \${lcaName} \${dataA.depth} đời.\`);
  pathParts.push(\`\${personB.full_name} cách \${lcaName} \${dataB.depth} đời.\`);

  return {
    aCallsB,
    bCallsA,
    description: \`\${description} (Tổ tiên chung: \${lcaName})\`,
    distance: minDistance,
    pathLabels: pathParts,
  };
}
`;

const newContent = before + newCode + after;
fs.writeFileSync(filePath, newContent);
console.log('Fixed findBloodKinship by extracting findLCA helper');