/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
"use server";

import { requireSession } from "@/lib/auth/session";
import {
  searchPtalCases as clientSearch,
  searchCasesByVector,
  buildCaseDetailUrl,
  buildVectorCaseDetailUrl,
  type PtalSearchParams,
  type PtalCase,
  type VectorSearchParams,
  type VectorCase,
  YuandianNotConfiguredError
} from "@/lib/yuandian/client";
import { getYuandianSettings } from "@/lib/yuandian/settings";
import { audit } from "@/server/audit";

export type CaseSearchHit = Omit<PtalCase, "url"> & {
  detailUrl: string;
};

export async function searchSimilarCases(
  params: PtalSearchParams & { matterId?: string }
): Promise<{ total: number; items: CaseSearchHit[]; pointsCharged: number }> {
  const session = await requireSession();

  const settings = await getYuandianSettings();
  if (!settings.configured) throw new YuandianNotConfiguredError();

  const { matterId, ...searchParams } = params;
  const res = await clientSearch(searchParams, settings);

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_CASE_SEARCH",
    targetType: matterId ? "Matter" : "SystemSetting",
    targetId: matterId ?? "yuandianSettings",
    detail: {
      ay: searchParams.ay,
      qw: searchParams.qw,
      xzqh_p: searchParams.xzqh_p,
      top_k: searchParams.top_k,
      total: res.total,
      hits: res.items.length
    }
  });

  return {
    total: res.total,
    items: res.items.map((c) => {
      const { url, ...rest } = c;
      return { ...rest, detailUrl: buildCaseDetailUrl(settings.caseDetailHost, url) };
    }),
    pointsCharged: 10
  };
}

// ============================================================
// v0.22: 语义检索
// ============================================================

export type VectorCaseHit = Omit<VectorCase, "scid"> & {
  scid: string;
  detailUrl: string;
};

export async function searchSimilarCasesByVector(
  params: VectorSearchParams & { matterId?: string }
): Promise<{ items: VectorCaseHit[]; pointsCharged: number }> {
  const session = await requireSession();
  const settings = await getYuandianSettings();
  if (!settings.configured) throw new YuandianNotConfiguredError();

  const { matterId, ...searchParams } = params;
  const res = await searchCasesByVector(searchParams, settings);

  await audit({
    userId: session.user.id,
    action: "YUANDIAN_CASE_VECTOR_SEARCH",
    targetType: matterId ? "Matter" : "SystemSetting",
    targetId: matterId ?? "yuandianSettings",
    detail: {
      query: searchParams.query,
      ay: searchParams.ay,
      xzqh_p: searchParams.xzqh_p,
      return_num: searchParams.return_num,
      hits: res.items.length
    }
  });

  return {
    items: res.items.map((c) => ({
      ...c,
      detailUrl: buildVectorCaseDetailUrl(settings.caseDetailHost, c.scid)
    })),
    pointsCharged: 10
  };
}
