/**
 * YuanDian Open Platform HTTP Client (server-side only)
 *
 * Entry: POST {baseUrl}/{routeKey}, header X-API-Key.
 * See details at https://open.chineselaw.com/llms-full.txt
 */
import { getYuandianSettings, type ResolvedYuandianSettings } from "./settings";

export class YuandianNotConfiguredError extends Error {
  constructor() {
    super("元典 API 未配置，请先到 设置 → AI 接入 填写元典 API key");
    this.name = "YuandianNotConfiguredError";
  }
}

export class YuandianApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = "YuandianApiError";
  }
}

export type PtalSearchParams = {
  ay?: string[]; // 案由数组
  ajlb?:
    | "刑事案件"
    | "民事案件"
    | "行政案件"
    | "执行案件"
    | "管辖案件"
    | "国家赔偿与司法救助案件"
    | "强制清算与破产案件"
    | "国际司法协助案件"
    | "非诉保全审查案件"
    | "其他案件";
  xzqh_p?: string[]; // 省级行政区
  wszl?: ("判决书" | "裁定书" | "调解书" | "决定书")[];
  qw?: string; // 全文关键词（空格拆分）
  ja_start?: string; // yyyy-MM-dd
  ja_end?: string;
  top_k?: number; // 默认 10，最大 50
};

export type PtalCase = {
  type: string;
  id: string;
  ah: string; // 案号
  title: string;
  ay: string[]; // 案由
  jbdw: string; // 经办法院
  ajlb: string; // 案件类别
  xzqh_p: string; // 省份
  wszl: string; // 文书种类
  cprq: string; // 裁判日期
  content: string; // 内容片段
  url: string; // 详情相对路径
  score: number;
};

export type PtalSearchResult = {
  total: number;
  items: PtalCase[];
};

/**
 * General case keyword search (rh_ptal_search, 10 POINT per call)
 *
 * Request body cannot be completely empty; caller must provide at least one filter (ay/qw/jbdw/etc).
 */
export async function searchPtalCases(
  params: PtalSearchParams,
  resolved?: ResolvedYuandianSettings
): Promise<PtalSearchResult> {
  const s = resolved ?? (await getYuandianSettings());
  if (!s.configured) throw new YuandianNotConfiguredError();

  // YuanDian requires non-empty body; caller must provide at least one filter
  const hasAny =
    (params.ay?.length ?? 0) > 0 ||
    !!params.qw?.trim() ||
    (params.xzqh_p?.length ?? 0) > 0 ||
    !!params.ajlb ||
    (params.wszl?.length ?? 0) > 0 ||
    !!params.ja_start ||
    !!params.ja_end;
  if (!hasAny) throw new Error("至少填写一个检索条件（案由 / 关键词 / 法院 / 地区 / 日期）");

  const body: Record<string, unknown> = {};
  if (params.ay?.length) body.ay = params.ay;
  if (params.ajlb) body.ajlb = params.ajlb;
  if (params.xzqh_p?.length) body.xzqh_p = params.xzqh_p;
  if (params.wszl?.length) body.wszl = params.wszl;
  if (params.qw?.trim()) {
    body.qw = params.qw.trim();
    body.search_mode = "and";
  }
  if (params.ja_start) body.ja_start = params.ja_start;
  if (params.ja_end) body.ja_end = params.ja_end;
  body.top_k = Math.min(Math.max(params.top_k ?? 10, 1), 50);

  const url = `${s.baseUrl.replace(/\/$/, "")}/rh_ptal_search`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let json: {
    status?: string;
    code?: number;
    message?: string;
    data?: { total?: number; lst?: PtalCase[] } | null;
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": s.apiKey,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json"
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!res.ok) {
      throw new YuandianApiError(`HTTP ${res.status}`, res.status);
    }
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  if (json.status !== "success") {
    throw new YuandianApiError(json.message ?? "元典返回失败", json.code ?? 500);
  }
  // 未命中：data === null
  if (!json.data) return { total: 0, items: [] };
  return {
    total: json.data.total ?? 0,
    items: json.data.lst ?? []
  };
}

/**
 * Build full URL for YuanDian frontend case detail (for "view full text" external link).
 * Default caseDetailHost: https://www.chineselaw.com, configurable in settings.
 */
export function buildCaseDetailUrl(host: string, relPath: string): string {
  const h = host.replace(/\/$/, "");
  const p = relPath.startsWith("/") ? relPath : `/${relPath}`;
  return `${h}${p}`;
}

// ============================================================
// v0.22: Semantic search case_vector_search (10 POINT per call)
// ============================================================

const WSZL_NAME_TO_CODE: Record<string, string> = {
  判决书: "1",
  裁定书: "2",
  调解书: "3",
  决定书: "4"
};

export type VectorSearchParams = {
  query: string; // required, natural language
  ay?: string[]; // cause names (vector accepts names, not codes)
  ajlb?: PtalSearchParams["ajlb"]; // same Chinese enums as ptal
  xzqh_p?: string; // ⚠ vector uses single string, not array
  wszl?: ("判决书" | "裁定书" | "调解书" | "决定书")[]; // we still pass names externally, convert to codes internally
  ja_start?: string;
  ja_end?: string;
  return_num?: number; // default 10, max 50 (we add protection)
};

export type VectorCase = {
  scid: string;
  title: string;
  ah: string;
  ay: string[]; // ⚠ Returns code array, not names
  anyou?: string[]; // cause names (fallback if field exists)
  jbdw: string | null;
  ajlb: string;
  wszl: string;
  xzqh_p: string;
  xzqh_c: string;
  cj: string;
  jaDate: number;
  jand: number;
  content: string;
  score: number;
};

export type VectorSearchResult = {
  items: VectorCase[];
};

export async function searchCasesByVector(
  params: VectorSearchParams,
  resolved?: ResolvedYuandianSettings
): Promise<VectorSearchResult> {
  const s = resolved ?? (await getYuandianSettings());
  if (!s.configured) throw new YuandianNotConfiguredError();
  const query = params.query.trim();
  if (!query) throw new Error("语义检索 query 不能为空");

  const filter: Record<string, unknown> = {};
  if (params.ay?.length) filter.ay = params.ay;
  if (params.ajlb) filter.wenshu_type = params.ajlb;
  if (params.xzqh_p) filter.xzqh_p = params.xzqh_p;
  if (params.wszl?.length) {
    const codes = params.wszl
      .map((n) => WSZL_NAME_TO_CODE[n])
      .filter((c): c is string => !!c);
    if (codes.length) filter.wszl = codes;
  }
  if (params.ja_start) filter.ja_start = params.ja_start;
  if (params.ja_end) filter.ja_end = params.ja_end;

  const body: Record<string, unknown> = { query };
  if (Object.keys(filter).length) body.wenshu_filter = filter;
  body.return_num = Math.min(Math.max(params.return_num ?? 10, 1), 50);
  body.rewrite_flag = false; // use original query; rewriting often gives weird results

  const url = `${s.baseUrl.replace(/\/$/, "")}/case_vector_search`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  let json: {
    code?: number;
    msg?: string;
    extra?: { wenshu?: VectorCase[] };
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": s.apiKey,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json"
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if (!res.ok) throw new YuandianApiError(`HTTP ${res.status}`, res.status);
    json = await res.json();
  } finally {
    clearTimeout(timer);
  }

  // Semantic interface success code is 201 (per docs); conservatively accept 200-299
  const code = json.code ?? 0;
  if (code < 200 || code >= 300) {
    throw new YuandianApiError(json.msg ?? "元典语义检索失败", code);
  }
  return { items: json.extra?.wenshu ?? [] };
}

/** Semantic search detail URL: scid → /ydzk/caseDetail/case/<scid> */
export function buildVectorCaseDetailUrl(host: string, scid: string): string {
  return buildCaseDetailUrl(host, `/ydzk/caseDetail/case/${scid}`);
}
