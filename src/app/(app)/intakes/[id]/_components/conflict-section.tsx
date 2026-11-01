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
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Search,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Info,
  Briefcase
} from "lucide-react";
import type {
  ConflictSeverity,
  ConflictConclusion,
  MatterCategory,
  MatterStatus,
  PartyRole,
  LitigationStanding
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { runCheckAndSave, setConflictConclusion } from "@/server/conflicts/actions";
import { litigationStandingLabel, matterCategoryLabel, matterStatusLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";

type Hit = {
  id: string;
  hitType: string;
  targetType: string;
  targetId: string;
  matchedName: string;
  matchedField: string;
  matchedValue: string;
  matchedRatio: number | null;
  severity: ConflictSeverity;
  reason: string;
  matter: {
    id: string;
    code: string;
    title: string;
    category: MatterCategory;
    status: MatterStatus;
    intakeDate: Date | null;
    canViewMatter: boolean;
    causeText: string | null;
    ownerName: string | null;
    partyRole: PartyRole | null;
    partyStanding: LitigationStanding | null;
  } | null;
};

type SameNameClient = { clientId: string; name: string };
type IdMatchedClient = { clientId: string; name: string; idNumber: string };

type LatestCheck = {
  id: string;
  conclusion: ConflictConclusion;
  hits: Hit[];
  decidedBy: { id: string; name: string } | null;
  decidedAt: Date | null;
  note: string | null;
  checkedAt: Date;
  sameNameClients: SameNameClient[];
  idMatchedClients: IdMatchedClient[];
};

type Props = {
  intakeId: string;
  intakeClientName?: string;
  intakeClientIdNumber?: string;
  opposingParties: { name: string; idNumber?: string }[];
  thirdParties: { name: string; idNumber?: string }[];
  latestCheck: LatestCheck | null;
  canEditConclusion: boolean;
};

const severityStyle: Record<ConflictSeverity, { color: string; bg: string; label: string }> = {
  BLOCKING: { color: "#DC2626", bg: "rgba(220,38,38,0.10)", label: "Chặn" },
  HIGH: { color: "#EA580C", bg: "rgba(234,88,12,0.10)", label: "Cao" },
  MEDIUM: { color: "#D97706", bg: "rgba(217,119,6,0.10)", label: "Trung bình" },
  LOW: { color: "#65A30D", bg: "rgba(101,163,13,0.10)", label: "Thấp" }
};

const conclusionLabel: Record<ConflictConclusion, string> = {
  PENDING: "Chờ kết luận",
  SAME_SUBJECT: "Có xung đột",
  DIFFERENT: "Có thể tiếp nhận",
  NEED_INFO: "Thông tin chưa đủ"
};

const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "Bên ủy quyền",
  OPPOSING_PARTY: "Bên đối phương",
  THIRD_PARTY: "Người thứ ba",
  CO_LITIGANT: "Đồng khởi kiện",
  AGENT: "Người đại diện",
  WITNESS: "Nhân chứng",
  OTHER: "Khác"
};

export function ConflictSection({
  intakeId,
  intakeClientName,
  intakeClientIdNumber,
  opposingParties,
  thirdParties,
  latestCheck,
  canEditConclusion
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [conclusionNote, setConclusionNote] = useState(latestCheck?.note ?? "");
  const needsHighRiskNote =
    latestCheck?.hits.some((h) => h.severity === "HIGH" || h.severity === "BLOCKING") ?? false;

  function handleRunCheck() {
    const queries: {
      role: "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";
      name: string;
      idNumber?: string;
    }[] = [];
    if (intakeClientName) {
      queries.push({
        role: "CLIENT_PARTY",
        name: intakeClientName,
        idNumber: intakeClientIdNumber
      });
    }
    for (const p of opposingParties) {
      queries.push({ role: "OPPOSING_PARTY", name: p.name, idNumber: p.idNumber });
    }
    for (const p of thirdParties) {
      queries.push({ role: "THIRD_PARTY", name: p.name, idNumber: p.idNumber });
    }
    if (queries.length === 0) {
      toast.warning("Không có bên tham gia nào để tra cứu", { description: "Vui lòng thêm bên ủy quyền hoặc bên đối phương trong tiếp nhận trước" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await runCheckAndSave({ intakeId, queries });
        toast.success("Tra cứu xung đột xong", {
          description: `Khớp ${res.hits.length} dòng · cùng tên trong kho khách ${res.sameNameClients.length}`
        });
      } catch (err) {
        toast.error("Tra cứu thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handleSetConclusion(conclusion: ConflictConclusion) {
    if (!latestCheck) return;
    if (conclusion === "DIFFERENT" && needsHighRiskNote && !conclusionNote.trim()) {
      toast.warning("Vui lòng bổ sung lý do tiếp nhận trước", {
        description: "Khi có rủi ro cao hoặc khớp chặn, cần ghi rõ lý do loại trừ hoặc để lại dấu vết đồng ý bằng văn bản"
      });
      return;
    }
    startTransition(async () => {
      try {
        await setConflictConclusion({
          checkId: latestCheck.id,
          conclusion,
          note: conclusionNote
        });
        toast.success("Đã lưu kết luận");
      } catch (err) {
        toast.error("Lưu thất bại", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <section className="ll-surface rounded-lg border border-border p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Tra cứu xung đột lợi ích
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Khớp các bên của vụ án lịch sử; cùng tên trong kho khách chỉ là gợi ý, không tính là xung đột
          </p>
        </div>

        <Button
          onClick={handleRunCheck}
          disabled={isPending}
          size="sm"
          className="gap-1.5"
          variant={latestCheck ? "outline" : "default"}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {latestCheck ? "Tra cứu lại" : "Chạy tra cứu xung đột"}
        </Button>
      </header>

      {!latestCheck ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Chưa chạy tra cứu xung đột
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tổng quan */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 p-2.5 text-[12px]">
            <span className="font-mono text-[11px] text-muted-foreground">
              {new Date(latestCheck.checkedAt).toLocaleString("zh-CN")}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>
              Khớp xung đột{" "}
              <span className="font-mono text-foreground">{latestCheck.hits.length}</span>
            </span>
            <Badge
              variant="outline"
              className={cn(
                "ml-1 text-[10px]",
                latestCheck.conclusion === "SAME_SUBJECT" && "border-destructive/40 text-destructive",
                latestCheck.conclusion === "DIFFERENT" && "border-[#65A30D]/40 text-[#65A30D]",
                latestCheck.conclusion === "NEED_INFO" && "border-amber-500/40 text-amber-600"
              )}
            >
              {conclusionLabel[latestCheck.conclusion]}
            </Badge>
            {latestCheck.decidedBy && (
              <span className="ml-auto text-[11px] text-muted-foreground">
                {latestCheck.decidedBy.name} ·{" "}
                {latestCheck.decidedAt
                  ? new Date(latestCheck.decidedAt).toLocaleDateString("zh-CN")
                  : ""}
              </span>
            )}
          </div>

          {/* Gợi ý cùng tên kho khách (không phải xung đột) */}
          {latestCheck.sameNameClients.length > 0 && (
            <InfoBar
              icon={<Info className="h-3.5 w-3.5" />}
              tone="info"
              text={`Kho khách đã có ${latestCheck.sameNameClients.length} bản ghi cùng tên (chỉ gợi ý, không phải xung đột)`}
            >
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latestCheck.sameNameClients.map((c) => (
                  <Link
                    key={c.clientId}
                    href={`/clients/${c.clientId}`}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary/40 hover:text-primary"
                  >
                    {c.name}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                ))}
              </div>
            </InfoBar>
          )}

          {/* Gợi ý khách trùng CMND (gợi ý mạnh) */}
          {latestCheck.idMatchedClients.length > 0 && (
            <InfoBar
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              tone="warn"
              text={`CMND / mã số thuế khớp chính xác với ${latestCheck.idMatchedClients.length} bản ghi trong kho khách, vui lòng kiểm tra thủ công có cùng chủ thể`}
            >
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latestCheck.idMatchedClients.map((c) => (
                  <Link
                    key={c.clientId}
                    href={`/clients/${c.clientId}`}
                    className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 hover:bg-amber-500/15"
                  >
                    {c.name} <span className="font-mono opacity-60">{c.idNumber}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                ))}
              </div>
            </InfoBar>
          )}

          {/* Danh sách khớp xung đột */}
          {latestCheck.hits.length === 0 ? (
            <div className="rounded-md border border-[#65A30D]/30 bg-[#65A30D]/10 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[#65A30D]" />
                <span className="text-foreground">Không khớp vụ án lịch sử, hệ thống đã đánh dấu có thể tiếp nhận</span>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {latestCheck.hits.map((h) => (
                <HitCard key={h.id} hit={h} />
              ))}
            </ul>
          )}

          {/* Kết luận */}
          {canEditConclusion && (
            <div className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-[13px] font-medium">Đánh dấu kết luận</h3>
              </div>
              <Textarea
                value={conclusionNote}
                onChange={(e) => setConclusionNote(e.target.value)}
                placeholder="Bổ sung (vd: đã đối chiếu xác nhận khác chủ thể; hoặc đã công bố rủi ro và có đồng ý bằng văn bản)"
                rows={2}
                className="mb-2 text-[12px]"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetConclusion("SAME_SUBJECT")}
                  disabled={isPending}
                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                >
                  Có xung đột (không tiếp nhận)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetConclusion("DIFFERENT")}
                  disabled={isPending}
                  className="border-[#65A30D]/40 text-[#65A30D] hover:bg-[#65A30D]/10"
                >
                  Có thể tiếp nhận
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetConclusion("NEED_INFO")}
                  disabled={isPending}
                >
                  Thông tin chưa đủ, chờ bổ sung
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function InfoBar({
  icon,
  tone,
  text,
  children
}: {
  icon: React.ReactNode;
  tone: "info" | "warn";
  text: string;
  children?: React.ReactNode;
}) {
  const colors =
    tone === "warn"
      ? { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-700" }
      : { border: "border-sky-500/25", bg: "bg-sky-500/10", text: "text-sky-700" };
  return (
    <div className={cn("rounded-md border p-2.5 text-[12px]", colors.border, colors.bg)}>
      <div className={cn("flex items-center gap-1.5 font-medium", colors.text)}>
        {icon}
        {text}
      </div>
      {children}
    </div>
  );
}

function HitCard({ hit }: { hit: Hit }) {
  const style = severityStyle[hit.severity];
  const m = hit.matter;
  const causeOrCategory = m ? (m.causeText ?? matterCategoryLabel[m.category]) : "—";
  const matterContent = m ? (
    <>
      <div className="flex items-center gap-2 text-[12px]">
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[11px] text-muted-foreground">{m.code}</span>
        <span className="truncate font-medium">{m.title}</span>
        {m.canViewMatter && (
          <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground transition-colors group-hover:text-primary" />
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <Field label="Ngày tiếp nhận hệ thống">{formatDate(m.intakeDate)}</Field>
        <Field label="Trạng thái hiện tại">{matterStatusLabel[m.status]}</Field>
        <Field label="Nguyên nhân/loại">{causeOrCategory}</Field>
        <Field label="Luật sư chủ trì">{m.ownerName ?? "—"}</Field>
        <Field label="Bên tham gia khớp">
          {hit.matchedName}{" "}
          <span className="text-foreground/70">
            ({m.partyRole ? partyRoleLabel[m.partyRole] : "—"}
            {m.partyStanding ? ` · ${litigationStandingLabel[m.partyStanding]}` : ""})
          </span>
        </Field>
        <Field label="Số giấy tờ">
          {hit.matchedField === "idNumber" ? (
            <span className="font-mono">{hit.matchedValue}</span>
          ) : (
            "—"
          )}
        </Field>
      </div>
    </>
  ) : null;
  return (
    <li
      className="rounded-md border p-3"
      style={{
        borderColor: `${style.color}40`,
        backgroundColor: style.bg
      }}
    >
      {/* Đầu: mức độ + trường khớp */}
      <div className="flex items-center gap-2 text-[11px]">
        <span
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium"
          style={{ color: style.color, background: `${style.color}1A` }}
        >
          <AlertTriangle className="h-3 w-3" />
          {style.label}
        </span>
        <span className="text-muted-foreground">
          {hit.matchedField === "idNumber" ? "Trùng số giấy tờ" : hit.matchedRatio === 1 ? "Trùng tên" : "Tên tương tự"}
        </span>
        {hit.matchedRatio !== null && hit.matchedRatio < 1 && (
          <span className="font-mono text-[10px] text-muted-foreground">
            {(hit.matchedRatio * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Thân: thông tin vụ án */}
      {m ? (
        m.canViewMatter ? (
          <Link
            href={`/matters/${m.id}`}
            className="group mt-2 block rounded border border-border bg-background p-2.5 hover:border-primary/40"
          >
            {matterContent}
          </Link>
        ) : (
          <div className="mt-2 rounded border border-border bg-background p-2.5">
            {matterContent}
          </div>
        )
      ) : (
        <p className="mt-2 text-[12px] text-muted-foreground">{hit.reason}</p>
      )}
    </li>
  );
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-CN");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <span className="shrink-0 text-muted-foreground/70">{label}：</span>
      <span className="truncate text-foreground/85">{children}</span>
    </div>
  );
}
