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

import { useState } from "react";
import Link from "next/link";
import { Pencil, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { matterCategoryLabel, matterCategoryKind } from "@/lib/enums";
import { formatDate, cn } from "@/lib/utils";
import type { MatterPayload, UserOption } from "./matter-detail-tabs";
import { TeamEditorDialog } from "./team-editor-dialog";
import { RelatedMattersField } from "./related-matters-field";

export function InfoPanel({
  matter,
  userOptions,
  contracts,
  canEditMatter,
  canManageRelatedMatters
}: {
  matter: MatterPayload;
  userOptions: UserOption[];
  /** v0.43 mục 1: hợp đồng ủy quyền = tệp tải lên ở giai đoạn tiếp nhận (duyệt), gắn với vụ án */
  contracts: { id: string; name: string }[];
  canEditMatter: boolean;
  canManageRelatedMatters: boolean;
}) {
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);

  const sortedMembers = matter.members.slice().sort((a, b) => {
    const order = { LEAD: 0, CO_LEAD: 1, ASSISTANT: 2 } as const;
    return order[a.role] - order[b.role];
  });
  const lead = sortedMembers.find((m) => m.role === "LEAD");
  const others = sortedMembers.filter((m) => m.role !== "LEAD");

  const primaryClient =
    matter.primaryClient
    ?? matter.clientLinks.find((cl) => cl.isPrimary)?.client
    ?? matter.clientLinks[0]?.client
    ?? null;

  const coLabel =
    others.length === 0
      ? "—"
      : others
          .map((m) => m.role === "CO_LEAD" ? m.user.name : `${m.user.name} (trợ lý)`)
          .join("，");
  // Chi tiết khách hàng
  const clientIdNumber = primaryClient?.idNumber ?? null;
  // Unused contact fields kept for future use
  // const clientContactName = clientContact?.name ?? null;
  // const clientPhone = clientContact?.phone ?? client?.phone ?? null;

  // Các bên khác của vụ án (người thứ ba / bên liên quan); bên đối phương hiển thị thống nhất ở bên của thủ tục trong chương trình vụ án
  const otherParties = matter.parties
    .filter(
      (p) =>
        p.role === "THIRD_PARTY" || p.role === "OTHER"
    )
    .map((p) => ({
      id: p.id,
      label: p.role === "THIRD_PARTY" ? "Người thứ ba" : "Bên liên quan",
      name: p.name,
      idNumber:
        p.partyType !== "NATURAL_PERSON" ? p.enterpriseSocialCode : p.idNumber,
      contactName: p.contactName,
      phone: p.phone
    }));

  // Vụ án liên quan (gộp hai chiều, khử trùng)
  const relatedMatters = [
    ...matter.linksFrom.map((l) => l.relatedMatter),
    ...matter.linksTo.map((l) => l.matter)
  ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  // v0.35: hiển thị phân nhánh theo loại vụ án (tố tụng/trọng tài vs phi tố tụng/đặc biệt vs tư vấn)
  const kind = matterCategoryKind(matter.category);
  const period = (s: Date | null, e: Date | null) => {
    if (!s && !e) return "—";
    return `${s ? formatDate(s) : "—"} ~ ${e ? formatDate(e) : "—"}`;
  };
  // v0.42 mục 11: bảng thông tin vụ án hiển thị「mã nội bộ」(trạng thái đã thể hiện ở Pill đầu trang)
  const claimCell = matter.claimAmount ? (
    <span className="font-mono tabular">¥{Number(matter.claimAmount).toLocaleString()}</span>
  ) : (
    "—"
  );

  return (
    <div className="h-full">
      {/* —— Thông tin vụ án: bảng rộng toàn phần, phân cột sáng-tối, mỗi hàng linh hoạt nhiều cột —— */}
      <section className="h-full rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-[13px] font-medium">
            Thông tin cơ bản
            <span className="ml-1.5 font-mono text-[11px] font-normal tabular text-muted-foreground/70">
              ｜ {matter.firmCaseNo || matter.internalCode}
            </span>
          </span>
          {canEditMatter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTeamEditorOpen(true)}
              className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-primary"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.8} />
              Sửa
            </Button>
          )}
        </header>
        <div className="overflow-hidden rounded-b-lg">
          {/* Hàng 1: thời gian tiếp nhận | loại vụ án */}
          <InfoRow>
            <Pair label="Thời gian tiếp nhận">
              {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
            </Pair>
            <Pair label="Loại vụ án">{matterCategoryLabel[matter.category]}</Pair>
          </InfoRow>
          {/* Hàng 2: phân nhánh theo loại —— tố tụng/trọng tài vs phi tố tụng/đặc biệt vs tư vấn */}
          {kind === "litigation" && (
            <InfoRow>
              <Pair label="Nguyên nhân">{matter.cause?.name ?? matter.causeFreeText ?? "—"}</Pair>
              <Pair label="Giá trị tranh chấp">{claimCell}</Pair>
            </InfoRow>
          )}
          {kind === "project" && (
            <>
              <InfoRow>
                <Pair label="Loại nghiệp vụ">{matter.businessType || "—"}</Pair>
                <Pair label="Giá trị dự án">{claimCell}</Pair>
              </InfoRow>
              <InfoRow>
                <Pair label="Thời gian bắt đầu-kết thúc">{period(matter.serviceStart, matter.serviceEnd)}</Pair>
                <Pair label="Sản phẩm bàn giao">{matter.deliverables || "—"}</Pair>
              </InfoRow>
            </>
          )}
          {kind === "counsel" && (
            <InfoRow>
              <Pair label="Loại tư vấn">{matter.counselType || "—"}</Pair>
              <Pair label="Thời hạn tư vấn">{period(matter.serviceStart, matter.serviceEnd)}</Pair>
            </InfoRow>
          )}
          {/* Hàng 3: luật sư chủ trì | nhân sự cộng tác */}
          <InfoRow>
            <Pair label="Luật sư chủ trì">{lead ? lead.user.name : "—"}</Pair>
            <Pair label="Nhân sự cộng tác">{coLabel}</Pair>
          </InfoRow>
          {/* Hàng 4: khách hàng | số giấy tờ */}
          <InfoRow>
            <Pair label="Khách hàng">
              {primaryClient ? (
                <Link
                  href={`/clients/${primaryClient.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {primaryClient.name}
                </Link>
              ) : (
                "—"
              )}
            </Pair>
            <Pair label="Số giấy tờ">
              <span className="font-mono tabular">{clientIdNumber ?? "—"}</span>
            </Pair>
          </InfoRow>
          {/* Hàng 5: các bên khác của vụ án (mỗi người một hàng) */}
          {otherParties.map((op) => (
            <InfoRow key={op.id}>
              <Pair label={op.label}>{op.name || "—"}</Pair>
              <Pair label="Số giấy tờ">
                <span className="font-mono tabular">{op.idNumber || "—"}</span>
              </Pair>
            </InfoRow>
          ))}
          {/* Hàng 6: hợp đồng ủy quyền */}
          <InfoRow>
            <Pair label="Hợp đồng ủy quyền" grow>
              <DelegationContracts contracts={contracts} />
            </Pair>
          </InfoRow>
          {/* Hàng 7: vụ án liên quan */}
          <InfoRow>
            <Pair label="Vụ án liên quan" grow>
              <RelatedMattersField
                matterId={matter.id}
                related={relatedMatters}
                canManage={canManageRelatedMatters}
              />
            </Pair>
          </InfoRow>
        </div>
      </section>

      {canEditMatter && (
        <TeamEditorDialog
          open={teamEditorOpen}
          onOpenChange={setTeamEditorOpen}
          matterId={matter.id}
          matterMeta={{
            internalCode: matter.internalCode,
            intakeDate: matter.intakeDate ?? null,
            category: matter.category,
            title: matter.title,
            causeId: matter.causeId ?? null,
            causeFreeText: matter.causeFreeText ?? null,
            claimAmount:
              matter.claimAmount === null || matter.claimAmount === undefined
                ? null
                : Number(matter.claimAmount),
            ourStanding: matter.ourStanding ?? null
          }}
          currentOwnerId={matter.ownerId}
          currentMembers={matter.members.map((m) => ({
            userId: m.userId,
            role: m.role,
            name: m.user.name
          }))}
          userOptions={userOptions}
        />
      )}
    </div>
  );
}

/* —— Sub-components —— */

// v0.43 mục 1: hợp đồng ủy quyền — tệp tải lên ở tiếp nhận, gắn với vụ án, bấm tên tệp để mở ngay trong trình duyệt
function DelegationContracts({ contracts }: { contracts: { id: string; name: string }[] }) {
  if (contracts.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {contracts.map((c) => (
        <a
          key={c.id}
          href={`/api/documents/${c.id}/download?inline=1`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
          title={c.name}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="max-w-[180px] truncate">{c.name}</span>
        </a>
      ))}
    </div>
  );
}

// Một hàng: mobile xếp dọc (giữa các pair có kẻ ngang), md+ xếp ngang (giữa các pair có kẻ dọc)
export function InfoRow({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col divide-y divide-border border-b border-border last:border-b-0 md:flex-row md:divide-x md:divide-y-0",
        className
      )}
    >
      {children}
    </div>
  );
}

// Một cặp nhãn-giá trị: nhãn nền xám (tối), giá trị nền trắng (sáng)
export function Pair({
  label,
  grow,
  wide,
  tight,
  children
}: {
  label: string;
  grow?: boolean;
  wide?: boolean;
  /** Chỉ chiếm bề rộng nội dung (giá trị không xuống dòng), dùng cho mã hệ thống/thời gian tiếp nhận các trường ngắn, tránh giãn thành hai hàng */
  tight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0",
        tight ? "md:flex-none" : wide ? "md:flex-[3]" : grow ? "md:flex-[2]" : "md:flex-1"
      )}
    >
      <div className="w-[68px] shrink-0 border-r border-border bg-muted/50 px-2 py-2 text-[11.5px] leading-snug text-muted-foreground">
        <AlignedLabel label={label} />
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 bg-card px-2.5 py-2 text-[12.5px] leading-snug text-foreground/95",
          tight ? "whitespace-nowrap" : "break-words"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function AlignedLabel({ label }: { label: string }) {
  const chars = Array.from(label);
  if (chars.length > 1 && chars.length < 4) {
    return (
      <span className="flex w-[4em] justify-between whitespace-nowrap">
        {chars.map((char, index) => (
          <span key={`${char}-${index}`}>{char}</span>
        ))}
      </span>
    );
  }

  return <span className="whitespace-nowrap">{label}</span>;
}
