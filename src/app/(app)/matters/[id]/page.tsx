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
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMatterById } from "@/server/matters/actions";
import { getMatterFinance } from "@/server/finance/actions";
import { listPreservationCases } from "@/server/preservations/actions-v2";
import { listActiveColleagues } from "@/server/users/actions";
import { getLatestArchiveRecord } from "@/server/archive/actions";
import { getMatterReviewSummary } from "@/server/ai/matter-review-summary";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { MatterDetailTabs } from "./_components/matter-detail-tabs";
import { ReviewSummaryCard } from "./_components/review-summary-card";

export default async function MatterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [matter, session] = await Promise.all([
    getMatterById(id),
    getSession()
  ]);
  if (!matter) notFound();

  const [finance, userOptions, documents, intakeContracts, folders, templates, preservations, allColleagues, sealContracts, expresses, latestArchive, customFieldDefs] = await Promise.all([
    getMatterFinance(matter.id),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" }
    }),
    prisma.document.findMany({
      where: { matterId: matter.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        procedure: { select: { id: true, type: true, customLabel: true } }
      }
    }),
    // v0.5: hợp đồng tải lên từ Intake (đồng thời gắn intakeId và matterId)
    matter.intakeId
      ? prisma.document.findMany({
          where: {
            intakeId: matter.intakeId,
            deletedAt: null
          },
          orderBy: { createdAt: "desc" },
          include: {
            uploadedBy: { select: { id: true, name: true } },
            procedure: { select: { id: true, type: true, customLabel: true } }
          }
        })
      : Promise.resolve([]),
    // v0.8: hồ sơ
    prisma.documentFolder.findMany({
      where: { matterId: matter.id },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, orderIndex: true, isDefault: true }
    }),
    // v0.8: mẫu áp dụng cho loại vụ án này
    prisma.documentTemplate.findMany({
      where: {
        enabled: true,
        OR: [
          { applicableCategories: { isEmpty: true } },
          { applicableCategories: { has: matter.category } }
        ]
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        applicableCategories: true,
        variables: true,
        isBuiltIn: true
      }
    }),
    // v0.9.3: bản ghi bảo toàn của vụ án
    listPreservationCases({ matterId: matter.id, status: "ALL" }),
    listActiveColleagues(),
    // v0.11: tệp hợp đồng liên kết yêu cầu dùng dấu của vụ án (bản chờ đóng dấu + bản scan sau đóng dấu)
    prisma.sealRequest.findMany({
      where: { matterId: matter.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        documentTitle: true,
        status: true,
        createdAt: true,
        draftDoc: { select: { id: true, name: true, size: true, createdAt: true } },
        stampedDoc: { select: { id: true, name: true, size: true, createdAt: true } }
      }
    }),
    // v0.11: theo dõi chuyển phát của vụ án
    prisma.expressTracking.findMany({
      where: { matterId: matter.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        trackingNo: true,
        companyCode: true,
        direction: true,
        purpose: true,
        lastState: true,
        lastUpdateAt: true,
        createdAt: true
      }
    }),
    // v0.18: trạng thái yêu cầu lưu trữ mới nhất (dùng cho banner "đang lưu trữ"/"đã từ chối")
    getLatestArchiveRecord(matter.id),
    // v0.28: định nghĩa trường tuỳ chỉnh của vụ án (mục đang bật)
    prisma.customFieldDef.findMany({
      where: { entityType: "MATTER", enabled: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, key: true, label: true, fieldType: true, options: true, required: true }
    })
  ]);

  // v0.22: tổng quan kiểm tra AI của vụ án (gộp ReviewRecord)
  const reviewSummary = await getMatterReviewSummary(matter.id);
  const currentMatterMember = session?.user.id
    ? matter.members.find((member) => member.userId === session.user.id)
    : null;
  const canAssociateThisMatter = Boolean(
    session?.user.id &&
      (matter.ownerId === session.user.id ||
        currentMatterMember)
  );
  const canLeadThisMatter = Boolean(
    session?.user.id &&
      (matter.ownerId === session.user.id ||
        currentMatterMember?.role === "LEAD" ||
        currentMatterMember?.role === "CO_LEAD")
  );
  const canOwnThisMatter = Boolean(session?.user.id && matter.ownerId === session.user.id);

  // v0.8: tài liệu tương ứng hồ sơ (gồm định danh templateId)
  const folderDocuments = documents.map((d) => ({
    id: d.id,
    name: d.name,
    size: d.size,
    folderId: d.folderId,
    templateId: d.templateId,
    createdAt: d.createdAt
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/matters"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Về danh sách vụ án
      </Link>

      <ReviewSummaryCard summary={reviewSummary} matterId={matter.id} />

      <MatterDetailTabs
        matter={matter}
        finance={finance}
        userOptions={userOptions}
        documents={documents}
        intakeContracts={intakeContracts}
        folders={folders}
        folderDocuments={folderDocuments}
        templates={templates.map((t) => ({
          ...t,
          variables: Array.isArray(t.variables) ? (t.variables as string[]) : []
        }))}
        preservations={preservations}
        colleagues={allColleagues.map((c) => ({ id: c.id, name: c.name }))}
        currentUserRole={session?.user.role ?? null}
        canAssociateThisMatter={canAssociateThisMatter}
        canLeadThisMatter={canLeadThisMatter}
        canOwnThisMatter={canOwnThisMatter}
        sealContracts={sealContracts}
        expresses={expresses}
        latestArchive={latestArchive}
        customFieldDefs={customFieldDefs}
      />
    </div>
  );
}
