import type { PersonNode, RelEdge, KinshipResult } from './types';
import { resolveBloodTerms } from './bloodTerms';

function enqueueParents(
  currentNode: PersonNode,
  depth: number,
  path: PersonNode[],
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
  queue: { id: string; depth: number; path: PersonNode[] }[]
) {
  const parents = parentMap.get(currentNode.id) ?? [];
  for (const pId of parents) {
    const pNode = personsMap.get(pId);
    if (pNode) {
      queue.push({
        id: pId,
        depth: depth + 1,
        path: [...path, currentNode],
      });
    }
  }
}

function traverseAncestors(
  initialId: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>
): Map<string, { depth: number; path: PersonNode[] }> {
  const depths = new Map<string, { depth: number; path: PersonNode[] }>();
  const queue: { id: string; depth: number; path: PersonNode[] }[] = [
    { id: initialId, depth: 0, path: [] },
  ];

  while (queue.length > 0) {
    const { id: currentId, depth, path } = queue.shift()!;
    if (!depths.has(currentId)) {
      depths.set(currentId, { depth, path });

      const currentNode = personsMap.get(currentId);
      if (!currentNode) continue;

      enqueueParents(currentNode, depth, path, parentMap, personsMap, queue);
    }
  }
  return depths;
}

function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
) {
  return traverseAncestors(id, parentMap, personsMap);
}


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

export function findBloodKinship(
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
  pathParts.push(`${personA.full_name} cách ${lcaName} ${dataA.depth} đời.`);
  pathParts.push(`${personB.full_name} cách ${lcaName} ${dataB.depth} đời.`);

  return {
    aCallsB,
    bCallsA,
    description: `${description} (Tổ tiên chung: ${lcaName})`,
    distance: minDistance,
    pathLabels: pathParts,
  };
}
// eslint-disable-next-line max-lines-per-function, max-statements

// ============ Extracted helpers for computeKinship ============

// Mapping tables for spouse-based transformation (reduce complexity)
const transformAMap: Record<string, (gender: string) => string> = {
  "Con": (g) => g === "male" ? "Con rể" : "Con dâu",
  "Cháu": (g) => g === "male" ? "Cháu rể" : "Cháu dâu",
  "Anh trai": (g) => g === "female" ? "Chị dâu" : "Anh rể",
  "Chị gái": (g) => g === "male" ? "Anh rể" : "Chị dâu",
  "Chị họ": () => "Anh (Chồng của Chị họ)",
  "Anh họ": () => "Chị (Vợ của Anh họ)",
  "Em": (g) => g === "male" ? "Em rể" : "Em dâu",
  "Chú": () => "Cô",
  "Cô": () => "Chú",
  "Cậu": () => "Dì",
  "Dì": () => "Cậu",
  "Bà Cô": () => "Ông Dượng"
};

const suffix = (g: string) => g === "male" ? " vợ" : " chồng";

const transformBMap: Record<string, (gender: string) => string> = {
  "Bố": (g) => "Bố" + suffix(g),
  "Mẹ": (g) => "Mẹ" + suffix(g),
  "Ông": (g) => "Ông" + suffix(g),
  "Bà": (g) => "Bà" + suffix(g),
  "Cụ": (g) => "Cụ" + suffix(g),
  "Anh trai": (g) => "Anh" + suffix(g),
  "Chị gái": (g) => "Chị" + suffix(g),
  "Em họ": (g) => "Em (Em họ của" + suffix(g) + ")",
  "Em": (g) => "Em" + suffix(g),
  "Bác": (g) => "Bác" + suffix(g),
  "Chú": (g) => "Chú" + suffix(g),
  "Cô": (g) => "Cô" + suffix(g),
  "Cậu": (g) => "Cậu" + suffix(g),
  "Dì": (g) => "Dì" + suffix(g),
  "Bác họ": (g) => "Bác" + suffix(g),
  "Chú họ": (g) => "Chú" + suffix(g),
  "Cô họ": (g) => "Cô" + suffix(g),
  "Cậu họ": (g) => "Cậu" + suffix(g),
  "Dì họ": (g) => "Dì" + suffix(g)
};

