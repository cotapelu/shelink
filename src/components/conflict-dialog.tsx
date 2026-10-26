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
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Info,
  Briefcase
} from "lucide-react";
import type {
  ConflictSeverity,
  LitigationStanding,
  MatterCategory,
  MatterStatus,
  PartyRole
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { runCheckAndSave } from "@/server/conflicts/actions";
import { litigationStandingLabel, matterCategoryLabel, matterStatusLabel } from "@/lib/enums";

type QueryRole = "CLIENT_PARTY" | "OPPOSING_PARTY" | "THIRD_PARTY";
type QueryRow = { role: QueryRole; name: string; idNumber: string };

type HitResult = {
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
  matterInfo: {
    matterId: string | null;
    canViewMatter: boolean;
    internalCode: string;
    title: string;
    category: MatterCategory;
    status: MatterStatus;
    intakeDate: string | null;
    causeText: string | null;
    ownerName: string | null;
    partyRole: PartyRole;
    partyStanding: LitigationStanding | null;
  } | null;
};

type SameNameClient = { clientId: string; name: string };
type IdMatchedClient = { clientId: string; name: string; idNumber: string };

const severityStyle: Record<ConflictSeverity, { color: string; bg: string; label: string }> = {
  BLOCKING: { color: "#F87171", bg: "rgba(248,113,113,0.12)", label: "Chan" },
  HIGH: { color: "#FB923C", bg: "rgba(251,146,60,0.12)", label: "Cao" },
  MEDIUM: { color: "#FBBF24", bg: "rgba(251,191,36,0.12)", label: "Trung binh" },
  LOW: { color: "#4ADE80", bg: "rgba(74,222,128,0.12)", label: "Thap" }
};

const queryRoleOptions: { value: QueryRole; label: string }[] = [
  { value: "CLIENT_PARTY", label: "Ben du kien uy quyen" },
  { value: "OPPOSING_PARTY", label: "Ben tuong ung" },
  { value: "THIRD_PARTY", label: "Nguoi thu ba" }
];

const partyRoleLabel: Record<PartyRole, string> = {
  CLIENT_PARTY: "Ben uy quyen",
  OPPOSING_PARTY: "Ben doi dinh",
  THIRD_PARTY: "Nguoi thu ba",
  CO_LITIGANT: "Dong nguyen don",
  AGENT: "Nguoi dai dien",
  WITNESS: "Nhan chung",
  OTHER: "Khac"
};

function emptyQuery(): QueryRow {
  return { role: "CLIENT_PARTY", name: "", idNumber: "" };
}

export function ConflictDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [queries, setQueries] = useState<QueryRow[]>([emptyQuery()]);
  const [results, setResults] = useState<HitResult[] | null>(null);
  const [sameName, setSameName] = useState<SameNameClient[]>([]);
  const [idMatched, setIdMatched] = useState<IdMatchedClient[]>([]);
  const [hasRun, setHasRun] = useState(false);

  function reset() {
    setQueries([emptyQuery()]);
    setResults(null);
    setSameName([]);
    setIdMatched([]);
    setHasRun(false);
  }

  function handleRun() {
    const cleaned = queries
      .map((q) => ({ role: q.role, name: q.name.trim(), idNumber: q.idNumber.trim() }))
      .filter((q) => q.name || q.idNumber);
    if (cleaned.length === 0) {
      toast.warning("Vui long nhap it nhat mot ho ten hoac so giay to");
      return;
    }

    startTransition(async () => {
      try {
        const res = await runCheckAndSave({ queries: cleaned });
        setResults(res.hits);
        setSameName(res.sameNameClients ?? []);
        setIdMatched(res.idMatchedClients ?? []);
        setHasRun(true);
        const extra =
          res.idMatchedClients?.length || res.sameNameClients?.length
            ? ` (cung ten ${res.sameNameClients?.length ?? 0} · khop so giay to ${res.idMatchedClients?.length ?? 0})`
            : "";
        if (res.hits.length === 0) {
          toast.success(`Khong trung xung dot${extra}`);
        } else {
          toast.success(`Trung ${res.hits.length} ban ghi${extra}, vui long xem xet`);
        }
      } catch (err) {
        toast.error("Tra cuu that bai", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border bg-background px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Tra cuu xung dot loi ich
          </DialogTitle>
          <DialogDescription className="text-xs">
            Nhap ho ten hoac so giay to can tra (it nhat mot), doi chieu nhanh voi khach hang va vu an trong lich su
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(85vh-140px)] space-y-4 overflow-y-auto px-6 py-4">
          {/* Muc nhap */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs">Muc tra cuu</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQueries((q) => [...q, emptyQuery()])}
                className="h-7 gap-1"
              >
                <Plus className="h-3 w-3" />
                Them
              </Button>
            </div>

            <div className="space-y-2">
              {queries.map((q, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 rounded-lg border border-border bg-background p-2"
                >
                  <div className="col-span-3">
                    <Select
                      value={q.role}
                      onValueChange={(value) =>
                        setQueries((qs) =>
                          qs.map((row, i) =>
                            i === idx ? { ...row, role: value as QueryRole } : row
                          )
                        )
                      }
                    >
                      <SelectTrigger className="h-9 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {queryRoleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={q.name}
                      onChange={(e) =>
                        setQueries((qs) =>
                          qs.map((row, i) => (i === idx ? { ...row, name: e.target.value } : row))
                        )
                      }
                      placeholder="Ho ten / Ten to chuc"
                      className="h-9 bg-background"
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={q.idNumber}
                      onChange={(e) =>
                        setQueries((qs) =>
                          qs.map((row, i) =>
                            i === idx ? { ...row, idNumber: e.target.value } : row
                          )
                        )
                      }
                      placeholder="CCCD / Ma so thue doanh nghiep"
                      className="h-9 bg-background font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {queries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQueries((qs) => qs.filter((_, i) => i !== idx))}
                        className="h-9 w-9 p-0 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Link
                href="/conflicts"
                className="text-[11px] text-muted-foreground hover:text-primary"
                onClick={() => onOpenChange(false)}
              >
                Xem trang ban ghi day du →
              </Link>
              <Button
                type="button"
                onClick={handleRun}
                disabled={isPending}
                className="gap-1.5 "
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Bat dau tra cuu
              </Button>
            </div>
          </section>

          {/* Cung ten trong kho khach hang (khong phai xung dot, chi ganh y) */}
          {hasRun && sameName.length > 0 && (
            <section className="rounded-md border border-[#5B8DEF]/30 bg-[#5B8DEF]/10 p-3">
              <div className="flex items-center gap-2 text-xs text-[#5B8DEF]">
                <Info className="h-3.5 w-3.5" />
                Kho khach hang da co {sameName.length} ban ghi cung ten (chi ganh y, khong phai xung dot)
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sameName.map((c) => (
                  <Link
                    key={c.clientId}
                    href={`/clients/${c.clientId}`}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary/40 hover:text-primary"
                  >
                    {c.name}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Khop chinh xac CCCD / ma tin dung (ganh y manh) */}
          {hasRun && idMatched.length > 0 && (
            <section className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                CCCD / ma tin dung khop chinh xac voi {idMatched.length} ban ghi trong kho khach hang, vui long doi chieu thu cong
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {idMatched.map((c) => (
                  <Link
                    key={c.clientId}
                    href={`/clients/${c.clientId}`}
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-amber-500/15"
                  >
                    {c.name}{" "}
                    <span className="font-mono opacity-60">{c.idNumber}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Ket qua */}
          {hasRun && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ket qua tra cuu ({results?.length ?? 0})
              </h3>

              {!results || results.length === 0 ? (
                <div className="rounded-md border border-[#4ADE80]/30 bg-[#4ADE80]/10 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#4ADE80]" />
                    <span>Khong trung khach hang hay vu an nao trong lich su</span>
                  </div>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {results.map((h) => {
                    const style = severityStyle[h.severity];
                    const targetHref =
                      h.matterInfo?.canViewMatter && h.matterInfo.matterId
                        ? `/matters/${h.matterInfo.matterId}`
                        : h.targetType === "Client"
                          ? `/clients/${h.targetId}`
                          : null;
                    return (
                      <li
                        key={h.id}
                        className="rounded-md border p-2.5"
                        style={{ borderColor: `${style.color}40`, backgroundColor: style.bg }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <AlertTriangle
                                className="h-3.5 w-3.5"
                                style={{ color: style.color }}
                              />
                              <span
                                className="text-xs font-semibold uppercase tracking-wider"
                                style={{ color: style.color }}
                              >
                                {style.label}
                              </span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">
                                {h.hitType === "HISTORICAL_CLIENT" ? "Khach hang lich su" : "Vu an lich su"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm">{h.reason}</p>
                            {h.matterInfo && <MatterContext info={h.matterInfo} hit={h} />}
                            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                              {h.matchedField} = {h.matchedValue}
                              {h.matchedRatio !== null && h.matchedRatio < 1 && (
                                <span className="ml-2">
                                  Do tuong dong {(h.matchedRatio * 100).toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                          {targetHref && (
                            <Link
                              href={targetHref}
                              onClick={() => onOpenChange(false)}
                              className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Xem
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MatterContext({ info, hit }: { info: NonNullable<HitResult["matterInfo"]>; hit: HitResult }) {
  const causeOrCategory = info.causeText ?? matterCategoryLabel[info.category];
  return (
    <div className="mt-2 rounded border border-border/80 bg-background/70 p-2 text-[11px]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-mono text-[10px] text-muted-foreground">{info.internalCode}</span>
        <span className="min-w-0 truncate font-medium text-foreground">{info.title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
        <Field label="Tiep nhan tu he thong">{formatDate(info.intakeDate)}</Field>
        <Field label="Trang thai hien tai">{matterStatusLabel[info.status]}</Field>
        <Field label="Can cu khoi kien/Loai">{causeOrCategory}</Field>
        <Field label="Luat su chu tri">{info.ownerName ?? "—"}</Field>
        <Field label="Vai tro trung">
          {partyRoleLabel[info.partyRole]}
          {info.partyStanding ? ` · ${litigationStandingLabel[info.partyStanding]}` : ""}
        </Field>
        <Field label="Chu the trung">{hit.matchedName}</Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <span className="shrink-0 text-muted-foreground/70">{label}:</span>
      <span className="truncate text-foreground/85">{children}</span>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-CN");
}
