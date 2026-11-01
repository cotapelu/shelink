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
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import type {
  PartyRole,
  PartyType,
  ProcedureOutcome,
  ProcedureType,
  LitigationStanding
} from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { litigationStandingLabel, partyTypeLabel, procedureToStandingOptions } from "@/lib/enums";
import { cn, formatDate } from "@/lib/utils";
import { updateProcedureInfo } from "@/server/matters/actions";
import { InfoRow, Pair } from "./info-panel";
import { JurisdictionSelect } from "@/app/(app)/intakes/_components/jurisdiction-select";
import { agencyOptions } from "@/lib/china-regions";

// v0.45: Map loại thủ tục → nhãn 「Thông tin XX」 (bao phủ mọi loại thủ tục)
const PROC_INFO_LABEL: Record<string, string> = {
  FIRST_INSTANCE: "Thông tin sơ thẩm",
  SECOND_INSTANCE: "Thông tin phúc thẩm",
  RETRIAL_REVIEW: "Thông tin xem xét tái thẩm",
  RETRIAL: "Thông tin tái thẩm",
  REMAND_FIRST: "Thông tin sơ thẩm lại",
  REMAND_SECOND: "Thông tin phúc thẩm lại",
  PROSECUTORIAL_SUPERVISION: "Thông tin giám sát kiểm sát",
  COMMERCIAL_ARBITRATION: "Thông tin trọng tài thương mại",
  LABOR_ARBITRATION: "Thông tin trọng tài lao động",
  ARBITRATION_SET_ASIDE: "Thông tin xin hủy án trọng tài",
  ARBITRATION_ENFORCEMENT_REVIEW: "Thông tin xem xét không thi hành án trọng tài",
  ENFORCEMENT: "Thông tin cưỡng chế thi hành",
  ENFORCEMENT_OBJECTION: "Thông tin phản đối thi hành án",
  INVESTIGATION: "Thông tin điều tra",
  PROSECUTION_REVIEW: "Thông tin xét xử truy tố",
  DEATH_PENALTY_REVIEW: "Thông tin xem xét tử hình",
  CRIMINAL_ENFORCEMENT: "Thông tin thi hành án hình sự",
  COMMUTATION_PAROLE_REVIEW: "Thông tin xem xét giảm án/tha tù",
  ADMIN_RECONSIDERATION: "Thông tin khiếu nại hành chính",
  ADMIN_NON_LITIGATION_ENFORCEMENT: "Thông tin thi hành hành chính phi tố tụng",
  NON_LITIGATION_PHASE: "Thông tin giai đoạn phi tố tụng",
  CUSTOM: "Thông tin thủ tục"
};

type Proc = {
  id: string;
  type: ProcedureType;
  caseNumber: string | null;
  handlingAgency: string | null;
  jurisdiction: string | null;
  presidingJudge: string | null;
  presidingJudgeContact: string | null;
  judgeAssistant: string | null;
  judgeAssistantContact: string | null;
  ourStanding: LitigationStanding | null;
  acceptedAt: Date | null;
  concludedAt: Date | null;
  outcome: ProcedureOutcome | null;
  outcomeNote: string | null;
  procedureParties: ProcedurePartyRow[];
};

type PartyLite = {
  id: string;
  role: PartyRole;
  standing: LitigationStanding | null;
  ordinal: number;
  name: string;
  partyType: PartyType;
  idNumber: string | null;
  phone: string | null;
  address: string | null;
  legalRep: string | null;
  contactName: string | null;
  enterpriseSocialCode: string | null;
};

type ProcedurePartyRow = {
  id: string;
  partyId: string;
  standing: LitigationStanding;
  ordinal: number;
  party: PartyLite;
};

type NewProcedurePartyDraft = {
  tempId: string;
  existingPartyId: string | null;
  name: string;
  role: PartyRole;
  partyType: PartyType;
  idNumber: string;
  enterpriseSocialCode: string;
  standings: LitigationStanding[];
};

const PARTY_ROLE_LABEL: Record<PartyRole, string> = {
  CLIENT_PARTY: "Khách hàng",
  OPPOSING_PARTY: "Bên đối phương",
  THIRD_PARTY: "Người thứ ba",
  CO_LITIGANT: "Đồng khởi kiện",
  AGENT: "Người đại diện",
  WITNESS: "Nhân chứng",
  OTHER: "Khác"
};

const PARTY_ROLE_OPTIONS: PartyRole[] = [
  "CLIENT_PARTY",
  "OPPOSING_PARTY",
  "THIRD_PARTY"
];

const PARTY_TYPE_OPTIONS: PartyType[] = [
  "NATURAL_PERSON",
  "COMPANY",
  "PARTNERSHIP",
  "INDIVIDUAL_BUSINESS",
  "INSTITUTION",
  "SOCIAL_ORG",
  "GOVERNMENT",
  "OTHER_ORG"
];

const PROCEDURE_OUTCOME_LABEL: Record<ProcedureOutcome, string> = {
  WON: "Thắng kiện",
  PARTIAL_WON: "Thắng kiện một phần",
  LOST: "Thua kiện",
  MEDIATED: "Hòa giải",
  WITHDRAWN: "Rút đơn",
  DISMISSED: "Bác bỏ",
  COMPLETED: "Hoàn thành",
  TRANSFERRED: "Chuyển giao",
  OTHER: "Khác"
};

function normalizePartyTypeForForm(partyType: PartyType): PartyType {
  return partyType === "ORGANIZATION" ? "OTHER_ORG" : partyType;
}

function normalizePartyRoleForForm(role: PartyRole): PartyRole {
  return PARTY_ROLE_OPTIONS.includes(role) ? role : "OPPOSING_PARTY";
}

function normalizeStandingForUi(standing: LitigationStanding): LitigationStanding {
  if (standing === "JOINT_PLAINTIFF") return "PLAINTIFF";
  if (standing === "JOINT_DEFENDANT") return "DEFENDANT";
  return standing;
}

// Xác định danh xưng 「thẩm phán chủ tọa」 theo loại thủ tục
const ARBITRATION: ProcedureType[] = [
  "COMMERCIAL_ARBITRATION",
  "LABOR_ARBITRATION",
  "ARBITRATION_SET_ASIDE",
  "ARBITRATION_ENFORCEMENT_REVIEW"
];
const EXECUTION: ProcedureType[] = [
  "ENFORCEMENT",
  "ENFORCEMENT_OBJECTION",
  "ADMIN_NON_LITIGATION_ENFORCEMENT",
  "CRIMINAL_ENFORCEMENT"
];

function roleLabels(type: ProcedureType): { judge: string } {
  if (ARBITRATION.includes(type)) return { judge: "Trọng tài viên trưởng" };
  if (EXECUTION.includes(type)) return { judge: "Thẩm phán thi hành án" };
  return { judge: "Thẩm phán chủ tọa" };
}

function requestLabel(type: ProcedureType) {
  return ARBITRATION.includes(type) ? "Yêu cầu trọng tài" : "Yêu cầu khởi kiện";
}

const dash = (v: string | null | undefined) => v?.trim() || "—";
const toInput = (d: Date | null) => (d ? new Date(d).toISOString().split("T")[0] : "");

function outcomeText(proc: Pick<Proc, "outcome" | "outcomeNote">) {
  return proc.outcomeNote?.trim() || (proc.outcome ? PROCEDURE_OUTCOME_LABEL[proc.outcome] : "—");
}

const REQUIRED_STANDINGS_BY_PROCEDURE: Partial<Record<ProcedureType, LitigationStanding[]>> = {
  FIRST_INSTANCE: ["PLAINTIFF", "DEFENDANT"],
  REMAND_FIRST: ["PLAINTIFF", "DEFENDANT"],
  SECOND_INSTANCE: ["APPELLANT", "APPELLEE"],
  REMAND_SECOND: ["APPELLANT", "APPELLEE"],
  RETRIAL_REVIEW: ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT"],
  RETRIAL: ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT"],
  PROSECUTORIAL_SUPERVISION: ["RETRIAL_APPLICANT", "RETRIAL_RESPONDENT"],
  COMMERCIAL_ARBITRATION: ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT"],
  LABOR_ARBITRATION: ["ARBITRATION_CLAIMANT", "ARBITRATION_RESPONDENT"],
  ENFORCEMENT: ["ENFORCEMENT_APPLICANT", "EXECUTED_PERSON"],
  ENFORCEMENT_OBJECTION: ["ENFORCEMENT_APPLICANT", "EXECUTED_PERSON"],
  ADMIN_RECONSIDERATION: [
    "ADMIN_RECONSIDERATION_APPLICANT",
    "ADMIN_RECONSIDERATION_RESPONDENT"
  ],
  NON_LITIGATION_PHASE: ["NON_LITIGATION_PARTY"],
  CUSTOM: ["NON_LITIGATION_PARTY"]
};

function standingOrder(type: ProcedureType, rows: ProcedurePartyRow[]) {
  const base = procedureToStandingOptions(type, "ours");
  const required = REQUIRED_STANDINGS_BY_PROCEDURE[type] ?? [];
  const assigned = rows.map((row) => normalizeStandingForUi(row.standing));
  return [...new Set([...required, ...base, ...assigned])];
}

function defaultStandingForParty(
  proc: Proc,
  party: PartyLite,
  partyStandingOptions: LitigationStanding[]
): LitigationStanding | null {
  const required = REQUIRED_STANDINGS_BY_PROCEDURE[proc.type] ?? [];
  const firstRequired = required[0] ?? partyStandingOptions[0] ?? null;
  const clientStanding =
    proc.ourStanding && partyStandingOptions.includes(normalizeStandingForUi(proc.ourStanding))
      ? normalizeStandingForUi(proc.ourStanding)
      : firstRequired;

  if (party.role === "CLIENT_PARTY") return clientStanding;
  if (party.role === "OPPOSING_PARTY") {
    return (
      required.find((standing) => standing !== clientStanding) ??
      partyStandingOptions.find((standing) => standing !== clientStanding) ??
      null
    );
  }
  if (party.role === "THIRD_PARTY" && partyStandingOptions.includes("THIRD_PARTY")) {
    return "THIRD_PARTY";
  }
  return null;
}

function buildInitialProcedureParties(
  proc: Proc,
  parties: PartyLite[],
  partyStandingOptions: LitigationStanding[]
) {
  const rows = proc.procedureParties.map((row) => ({
    partyId: row.partyId,
    standing: normalizeStandingForUi(row.standing)
  }));
  const assignedPartyIds = new Set(rows.map((row) => row.partyId));

  for (const party of parties) {
    if (assignedPartyIds.has(party.id)) continue;
    const standing = defaultStandingForParty(proc, party, partyStandingOptions);
    if (standing) {
      rows.push({ partyId: party.id, standing });
      assignedPartyIds.add(party.id);
    }
  }

  return rows;
}

function PartyNameWithClientBadge({ party }: { party: Pick<PartyLite, "name" | "role"> }) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-1 align-middle" title={party.name}>
      <span className="min-w-0 truncate">{party.name}</span>
      {party.role === "CLIENT_PARTY" && (
        <span className="shrink-0 rounded border border-primary/20 bg-primary/10 px-1 py-0 text-[10px] font-medium leading-4 text-primary">
          Khách hàng
        </span>
      )}
    </span>
  );
}

function standingTone(standing: LitigationStanding | null) {
  if (!standing) return "border-border bg-muted/40 text-muted-foreground";
  if (
    [
      "PLAINTIFF",
      "APPELLANT",
      "RETRIAL_APPLICANT",
      "ENFORCEMENT_APPLICANT",
      "ARBITRATION_CLAIMANT",
      "ADMIN_RECONSIDERATION_APPLICANT",
      "ADMIN_PLAINTIFF"
    ].includes(standing)
  ) {
    return "border-blue-500/25 bg-blue-500/10 text-blue-700";
  }
  if (
    [
      "DEFENDANT",
      "APPELLEE",
      "RETRIAL_RESPONDENT",
      "EXECUTED_PERSON",
      "ARBITRATION_RESPONDENT",
      "ADMIN_RECONSIDERATION_RESPONDENT",
      "ADMIN_DEFENDANT"
    ].includes(standing)
  ) {
    return "border-rose-500/25 bg-rose-500/10 text-rose-700";
  }
  if (standing === "THIRD_PARTY") {
    return "border-violet-500/25 bg-violet-500/10 text-violet-700";
  }
  return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700";
}

function StandingName({
  standing,
  children
}: {
  standing: LitigationStanding | null;
  children: string;
}) {
  const chars = Array.from(children);
  if (chars.length === 2) {
    return (
      <span
        className={cn(
          "inline-flex h-5 w-[3.8em] items-center justify-between rounded border px-1 text-[11px] font-medium whitespace-nowrap",
          standingTone(standing)
        )}
      >
        {chars.map((char, index) => (
          <span key={`${char}-${index}`}>{char}</span>
        ))}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded border px-1.5 text-[11px] font-medium leading-4 whitespace-nowrap",
        standingTone(standing)
      )}
    >
      {children}
    </span>
  );
}

function partyDetailItems(party: PartyLite) {
  const idValue = party.partyType === "NATURAL_PERSON" ? party.idNumber : party.enterpriseSocialCode;
  const items: string[] = [];
  if (party.contactName) items.push(`Người liên hệ: ${party.contactName}`);
  if (party.phone) items.push(`Điện thoại: ${party.phone}`);
  if (idValue) items.push(`${party.partyType === "NATURAL_PERSON" ? "Số giấy tờ" : "Mã số thuế"}：${idValue}`);
  if (party.partyType !== "NATURAL_PERSON" && party.legalRep) items.push(`Người đại diện: ${party.legalRep}`);
  if (party.address) items.push(`Địa chỉ: ${party.address}`);
  return items;
}

export function ProcedureInfoPanel({
  procedure: p,
  parties,
  requestContent,
  editOpen,
  onEditOpenChange
}: {
  procedure: Proc;
  parties: PartyLite[];
  requestContent?: string | null;
  editOpen?: boolean;
  onEditOpenChange?: (o: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = editOpen ?? internalOpen;
  const setOpen = onEditOpenChange ?? setInternalOpen;
  const { judge } = roleLabels(p.type);
  const requestText = dash(requestContent);
  const standingOptions = procedureToStandingOptions(p.type, "ours");
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="overflow-hidden rounded-lg">
        <InfoRow>
          <Pair label="Thời điểm tiếp nhận">{p.acceptedAt ? formatDate(p.acceptedAt) : "—"}</Pair>
          <Pair label="Số án">
            <span className="font-mono tabular">{dash(p.caseNumber)}</span>
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="Địa giới">{dash(p.jurisdiction)}</Pair>
          <Pair label="Cơ quan xử lý">{dash(p.handlingAgency)}</Pair>
        </InfoRow>
        <InfoRow>
          <Pair label={judge}>{dash(p.presidingJudge)}</Pair>
          <Pair label="Liên hệ">
            <span className="font-mono tabular">{dash(p.presidingJudgeContact)}</span>
          </Pair>
        </InfoRow>
        <ProcedurePartiesSummary type={p.type} rows={p.procedureParties} parties={parties} />
        <InfoRow className="border-t border-border">
          <Pair label={requestLabel(p.type)} grow>
            <span className="block whitespace-pre-wrap break-words">{requestText}</span>
          </Pair>
        </InfoRow>
        <InfoRow>
          <Pair label="Thời điểm kết thúc">{p.concludedAt ? formatDate(p.concludedAt) : "—"}</Pair>
          <Pair label="Kết quả giải quyết">{outcomeText(p)}</Pair>
        </InfoRow>
      </div>

      <EditDialog
        key={p.id}
        open={open}
        onOpenChange={setOpen}
        proc={p}
        parties={parties}
        judge={judge}
        standingOptions={standingOptions}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </section>
  );
}

function ProcedurePartiesSummary({
  type,
  rows,
  parties
}: {
  type: ProcedureType;
  rows: ProcedurePartyRow[];
  parties: PartyLite[];
}) {
  const assignedPartyIds = new Set(rows.map((row) => row.partyId));
  const standingRank = new Map(standingOrder(type, rows).map((standing, index) => [standing, index]));
  const assignedParties = rows.reduce((acc, row) => {
    const partyRows = acc.get(row.partyId) ?? [];
    partyRows.push(row);
    acc.set(row.partyId, partyRows);
    return acc;
  }, new Map<string, ProcedurePartyRow[]>());
  const partyRows = [
    ...Array.from(assignedParties.values()).map((partyRows) => {
      const sortedRows = partyRows
        .map((row) => ({ ...row, standing: normalizeStandingForUi(row.standing) }))
        .sort((a, b) => {
          const standingDiff =
            (standingRank.get(a.standing) ?? Number.MAX_SAFE_INTEGER) -
            (standingRank.get(b.standing) ?? Number.MAX_SAFE_INTEGER);
          return standingDiff || a.ordinal - b.ordinal;
        });
      const standings = Array.from(new Set(sortedRows.map((row) => row.standing)));
      return {
        party: sortedRows[0].party,
        primaryStanding: standings[0] ?? null,
        otherStandings: standings.slice(1),
        ordinal: Math.min(...sortedRows.map((row) => row.ordinal))
      };
    }),
    ...parties
      .filter((party) => !assignedPartyIds.has(party.id))
      .map((party) => ({
        party,
        primaryStanding: null,
        otherStandings: [] as LitigationStanding[],
        ordinal: party.ordinal
      }))
  ].sort((a, b) => {
    const standingDiff =
      (a.primaryStanding ? standingRank.get(a.primaryStanding) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER) -
      (b.primaryStanding ? standingRank.get(b.primaryStanding) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER);
    return standingDiff || a.ordinal - b.ordinal || a.party.name.localeCompare(b.party.name, "zh-Hans-CN");
  });

  return (
    <div className="bg-card">
      {partyRows.length === 0 ? (
        <div className="px-2.5 py-2 text-xs text-muted-foreground">Chưa có bên tham gia vụ án</div>
      ) : (
        <div className="divide-y divide-border">
          {partyRows.map(({ party, primaryStanding, otherStandings }) => {
            const details = partyDetailItems(party);
            return (
              <div
                key={party.id}
                className="grid min-h-8 grid-cols-1 gap-x-2 gap-y-1 px-2.5 py-2 text-xs sm:grid-cols-2 sm:items-start"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span className="shrink-0">
                    <StandingName standing={primaryStanding}>
                      {primaryStanding ? litigationStandingLabel[primaryStanding] : "Chưa đặt lập trường"}
                    </StandingName>
                  </span>
                  <div className="flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
                    <PartyNameWithClientBadge party={party} />
                    {otherStandings.length > 0 && (
                      <span className="min-w-0 truncate text-[11px] text-muted-foreground">
                        （{otherStandings.map((standing) => litigationStandingLabel[standing]).join("、")}）
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="min-w-0 break-words text-left text-[11px] leading-4 text-muted-foreground"
                  title={details.join(" · ")}
                >
                  {details.length > 0 ? details.join(" · ") : "Chưa có thông tin liên hệ và địa chỉ"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditDialog({
  open,
  onOpenChange,
  proc,
  parties,
  judge,
  standingOptions,
  onSaved
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  proc: Proc;
  parties: PartyLite[];
  judge: string;
  standingOptions: LitigationStanding[];
  onSaved: () => void;
}) {
  const partyStandingOptions = standingOrder(proc.type, proc.procedureParties);
  const [form, setForm] = useState(() => ({
    jurisdiction: proc.jurisdiction ?? "",
    handlingAgency: proc.handlingAgency ?? "",
    caseNumber: proc.caseNumber ?? "",
    presidingJudge: proc.presidingJudge ?? "",
    presidingJudgeContact: proc.presidingJudgeContact ?? "",
    ourStanding: (proc.ourStanding ?? "") as string,
    acceptedAt: toInput(proc.acceptedAt),
    concludedAt: toInput(proc.concludedAt)
  }));
  const [procedureParties, setProcedureParties] = useState(() =>
    buildInitialProcedureParties(proc, parties, partyStandingOptions)
  );
  const [newPartyForm, setNewPartyForm] = useState(() => ({
    existingPartyId: null as string | null,
    name: "",
    role: "OPPOSING_PARTY" as PartyRole,
    partyType: "NATURAL_PERSON" as PartyType,
    idNumber: "",
    enterpriseSocialCode: "",
    standings: partyStandingOptions.slice(0, 1)
  }));
  const [newProcedureParties, setNewProcedureParties] = useState<NewProcedurePartyDraft[]>([]);
  const [showNewPartyForm, setShowNewPartyForm] = useState(false);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function toggleProcedureParty(partyId: string, standing: LitigationStanding, checked: boolean) {
    setProcedureParties((rows) => {
      const next = rows.filter((row) => !(row.partyId === partyId && row.standing === standing));
      return checked ? [...next, { partyId, standing }] : next;
    });
  }

  function hasProcedureStanding(partyId: string, standing: LitigationStanding) {
    return procedureParties.some((row) => row.partyId === partyId && row.standing === standing);
  }

  function setNewPartyFormValue<K extends keyof typeof newPartyForm>(
    key: K,
    value: (typeof newPartyForm)[K]
  ) {
    setNewPartyForm((cur) => ({ ...cur, [key]: value }));
  }

  function toggleNewPartyFormStanding(standing: LitigationStanding, checked: boolean) {
    setNewPartyForm((cur) => ({
      ...cur,
      standings: checked
        ? [...new Set([...cur.standings, standing])]
        : cur.standings.filter((s) => s !== standing)
    }));
  }

  function toggleNewDraftStanding(tempId: string, standing: LitigationStanding, checked: boolean) {
    setNewProcedureParties((rows) =>
      rows.map((row) =>
        row.tempId === tempId
          ? {
              ...row,
              standings: checked
                ? [...new Set([...row.standings, standing])]
                : row.standings.filter((s) => s !== standing)
            }
          : row
      )
    );
  }

  function handleNewPartyNameChange(name: string) {
    const matchedParty = parties.find((party) => party.name.trim() === name.trim());
    setNewPartyForm((cur) => {
      if (!matchedParty) return { ...cur, existingPartyId: null, name };
      return {
        ...cur,
        existingPartyId: matchedParty.id,
        name,
        role: normalizePartyRoleForForm(matchedParty.role),
        partyType: normalizePartyTypeForForm(matchedParty.partyType),
        idNumber: matchedParty.idNumber ?? "",
        enterpriseSocialCode: matchedParty.enterpriseSocialCode ?? ""
      };
    });
  }

  function addNewProcedureParty() {
    const name = newPartyForm.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên bên tham gia");
      return;
    }
    if (newPartyForm.standings.length === 0) {
      toast.error("Vui lòng chọn lập trường thủ tục");
      return;
    }
    if (newPartyForm.partyType === "NATURAL_PERSON" && !newPartyForm.idNumber.trim()) {
      toast.error("Vui lòng nhập số giấy tờ");
      return;
    }
    if (newPartyForm.partyType !== "NATURAL_PERSON" && !newPartyForm.enterpriseSocialCode.trim()) {
      toast.error("Vui lòng nhập mã số thuế");
      return;
    }
    setNewProcedureParties((rows) => [
      ...rows,
      {
        tempId: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        existingPartyId: newPartyForm.existingPartyId,
        name,
        role: newPartyForm.role,
        partyType: newPartyForm.partyType,
        idNumber: newPartyForm.idNumber.trim(),
        enterpriseSocialCode: newPartyForm.enterpriseSocialCode.trim(),
        standings: newPartyForm.standings
      }
    ]);
    setNewPartyForm((cur) => ({
      ...cur,
      existingPartyId: null,
      name: "",
      idNumber: "",
      enterpriseSocialCode: ""
    }));
    setShowNewPartyForm(false);
  }

  function save() {
    if (newProcedureParties.some((party) => party.standings.length === 0)) {
      toast.error("Bên mới cần chọn ít nhất một lập trường thủ tục");
      return;
    }
    startTransition(async () => {
      try {
        await updateProcedureInfo({
          procedureId: proc.id,
          ...form,
          ourStanding: form.ourStanding || null,
          acceptedAt: form.acceptedAt || null,
          concludedAt: form.concludedAt || null,
          procedureParties,
          newProcedureParties: newProcedureParties.map(({ existingPartyId, name, role, partyType, idNumber, enterpriseSocialCode, standings }) => ({
            existingPartyId,
            name,
            role,
            partyType,
            idNumber,
            enterpriseSocialCode,
            standings
          }))
        });
        toast.success("Đã lưu");
        onSaved();
      } catch (err) {
        toast.error("Lưu thất bại", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[92vw] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sửa {PROC_INFO_LABEL[proc.type] ?? "Thông tin thủ tục"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldRow label="Địa giới (tỉnh/thành/phường)">
            <JurisdictionSelect
              value={form.jurisdiction}
              onChange={(v) => set("jurisdiction", v)}
            />
          </FieldRow>
          <FieldRow label="Cơ quan xử lý">
            <Input
              list={`proc-agency-${proc.id}`}
              value={form.handlingAgency}
              onChange={(e) => set("handlingAgency", e.target.value)}
              placeholder="vd: Toà án Nhân dân quận..."
            />
            <datalist id={`proc-agency-${proc.id}`}>
              {agencyOptions(form.jurisdiction).map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </FieldRow>
          <FieldRow label="Số án">
            <Input value={form.caseNumber} onChange={(e) => set("caseNumber", e.target.value)} className="font-mono" />
          </FieldRow>
          <FieldRow label="Lập trường phía ta">
            <Select value={form.ourStanding} onValueChange={(v) => set("ourStanding", v)}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Chọn lập trường phía ta" />
              </SelectTrigger>
              <SelectContent>
                {standingOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {litigationStandingLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={judge}>
            <Input value={form.presidingJudge} onChange={(e) => set("presidingJudge", e.target.value)} />
          </FieldRow>
          <FieldRow label={`${judge} — Liên hệ`}>
            <Input value={form.presidingJudgeContact} onChange={(e) => set("presidingJudgeContact", e.target.value)} className="font-mono" />
          </FieldRow>
          <FieldRow label="Thời điểm tiếp nhận">
            <Input type="date" value={form.acceptedAt} onChange={(e) => set("acceptedAt", e.target.value)} />
          </FieldRow>
          <FieldRow label="Thời điểm kết thúc / quyết định">
            <Input type="date" value={form.concludedAt} onChange={(e) => set("concludedAt", e.target.value)} />
          </FieldRow>
          <div className="space-y-2 border-t border-border pt-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-xs">Các bên của thủ tục</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewPartyForm((visible) => !visible)}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                {showNewPartyForm ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {showNewPartyForm ? "Thu lại" : "Thêm"}
              </Button>
            </div>
            {parties.length === 0 ? (
              <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                Chưa có bên tham gia vụ án
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {parties.map((party) => (
                  <div key={party.id} className="border-t border-border p-2 first:border-t-0">
                    <div className="mb-2 flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-xs font-medium" title={party.name}>
                        <PartyNameWithClientBadge party={party} />
                      </span>
                      {party.standing && (
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {litigationStandingLabel[normalizeStandingForUi(party.standing)]}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {partyStandingOptions.map((standing) => (
                        <label
                          key={`${party.id}-${standing}`}
                          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                        >
                          <Checkbox
                            checked={hasProcedureStanding(party.id, standing)}
                            onCheckedChange={(checked) =>
                              toggleProcedureParty(party.id, standing, checked === true)
                            }
                          />
                          <span>{litigationStandingLabel[standing]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {newProcedureParties.length > 0 && (
              <div className="rounded-md border border-border">
                {newProcedureParties.map((party) => (
                  <div key={party.tempId} className="border-t border-border p-2 first:border-t-0">
                    <div className="mb-2 flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-xs font-medium" title={party.name}>
                        <PartyNameWithClientBadge party={party} />
                      </span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {PARTY_ROLE_LABEL[party.role]} · {partyTypeLabel[party.partyType]}
                      </span>
                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {party.partyType === "NATURAL_PERSON"
                          ? party.idNumber
                          : party.enterpriseSocialCode}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewProcedureParties((rows) =>
                            rows.filter((row) => row.tempId !== party.tempId)
                          )
                        }
                        className="ml-auto rounded p-0.5 text-muted-foreground hover:text-destructive"
                        title="Xóa"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-2">
                      {partyStandingOptions.map((standing) => (
                        <label
                          key={`${party.tempId}-${standing}`}
                          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                        >
                          <Checkbox
                            checked={party.standings.includes(standing)}
                            onCheckedChange={(checked) =>
                              toggleNewDraftStanding(party.tempId, standing, checked === true)
                            }
                          />
                          <span>{litigationStandingLabel[standing]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showNewPartyForm && (
              <div className="rounded-md border border-dashed border-border p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_120px_120px_minmax(0,1fr)_auto]">
                  <Input
                    list={`new-procedure-party-${proc.id}`}
                    value={newPartyForm.name}
                    onChange={(e) => handleNewPartyNameChange(e.target.value)}
                    placeholder="Tên bên tham gia mới"
                    className="h-8"
                  />
                  <datalist id={`new-procedure-party-${proc.id}`}>
                    {parties.map((party) => (
                      <option key={party.id} value={party.name} />
                    ))}
                  </datalist>
                  <Select
                    value={newPartyForm.role}
                    onValueChange={(v) => setNewPartyFormValue("role", v as PartyRole)}
                  >
                    <SelectTrigger className="h-8 bg-background text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTY_ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>
                          {PARTY_ROLE_LABEL[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={newPartyForm.partyType}
                    onValueChange={(v) => setNewPartyFormValue("partyType", v as PartyType)}
                  >
                    <SelectTrigger className="h-8 bg-background text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARTY_TYPE_OPTIONS.map((partyType) => (
                        <SelectItem key={partyType} value={partyType}>
                          {partyTypeLabel[partyType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={
                      newPartyForm.partyType === "NATURAL_PERSON"
                        ? newPartyForm.idNumber
                        : newPartyForm.enterpriseSocialCode
                    }
                    onChange={(e) =>
                      newPartyForm.partyType === "NATURAL_PERSON"
                        ? setNewPartyFormValue("idNumber", e.target.value)
                        : setNewPartyFormValue("enterpriseSocialCode", e.target.value)
                    }
                    placeholder={
                      newPartyForm.partyType === "NATURAL_PERSON"
                        ? "Số giấy tờ"
                        : "Mã số thuế"
                    }
                    className="h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addNewProcedureParty}
                    className="h-8 px-2 text-xs"
                  >
                    Xác nhận thêm
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
                  {partyStandingOptions.map((standing) => (
                    <label
                      key={`new-form-${standing}`}
                      className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <Checkbox
                        checked={newPartyForm.standings.includes(standing)}
                        onCheckedChange={(checked) =>
                          toggleNewPartyFormStanding(standing, checked === true)
                        }
                      />
                      <span>{litigationStandingLabel[standing]}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Huỷ
          </Button>
          <Button onClick={save} disabled={pending} className="gap-1.5">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
