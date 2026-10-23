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
