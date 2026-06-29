/*
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
