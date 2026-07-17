"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, XCircle, Pencil, Archive } from "lucide-react";
import type { ExternalContactItem } from "./contacts-view";
import type { ExternalContactCategory } from "@prisma/client";
import {
  approveExternalContact,
  archiveExternalContact,
  rejectExternalContact
} from "@/server/external-contacts/actions";

interface ExternalContactListProps {
  externalContacts: ExternalContactItem[];
  currentUserId: string;
  currentUserRole: string;
  canReviewContacts: boolean;
  onEdit: (c: ExternalContactItem) => void;
}

export function ExternalContactList({
  externalContacts,
  currentUserId,
  currentUserRole,
  canReviewContacts,
  onEdit
}: ExternalContactListProps) {
  const router = useRouter();

  const canEdit = (c: ExternalContactItem) =>
    currentUserRole === "ADMIN" ||
    currentUserRole === "PRINCIPAL_LAWYER" ||
    c.createdBy.id === currentUserId;

  async function handleArchive(c: ExternalContactItem) {
    if (!confirm(`归档联系人"${c.name}"？`)) return;
    try {
      await archiveExternalContact(c.id);
      toast.success("已归档");
      router.refresh();
    } catch (err) {
      toast.error("归档失败", { description: err instanceof Error ? err.message : "" });
    }
  }

  async function handleApprove(c: ExternalContactItem) {
    if (!confirm(`通过联系人"${c.name}"？通过后将对全所展示。`)) return;
    try {
      await approveExternalContact({ id: c.id });
      toast.success("已通过");
      router.refresh();
    } catch (err) {
      toast.error("审核失败", { description: err instanceof Error ? err.message : "" });
    }
  }

  async function handleReject(c: ExternalContactItem) {
    const note = prompt(`驳回联系人"${c.name}"的原因（可选）`);
    if (note === null) return;
    try {
      await rejectExternalContact({ id: c.id, note });
      toast.success("已驳回");
      router.refresh();
    } catch (err) {
      toast.error("审核失败", { description: err instanceof Error ? err.message : "" });
    }
  }

  if (externalContacts.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border bg-background py-8 text-center text-xs text-muted-foreground">
        暂无匹配联系人
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {externalContacts.map((c) => {
        const canAct = canEdit(c) || (canReviewContacts && c.status === "PENDING_REVIEW");
        return (
          <li
            key={c.id}
            className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {EXT_CATEGORY_LABEL[c.category]}
                </span>
                {c.status === "PENDING_REVIEW" && (
                  <span className="rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    待审核
                  </span>
                )}
                {c.title && (
                  <span className="text-[11px] text-muted-foreground">{c.title}</span>
                )}
              </div>
              {c.organization && (
                <div className="text-[11px] text-foreground/80">{c.organization}</div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-foreground/80">
                {c.phone && <span className="font-mono">{c.phone}</span>}
                {c.email && <span className="font-mono">{c.email}</span>}
                {c.wechat && <span>微信 {c.wechat}</span>}
              </div>
              {c.address && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">{c.address}</div>
              )}
              {c.notes && (
                <div className="mt-1 text-[11px] italic text-muted-foreground">{c.notes}</div>
              )}
              {c.status === "PENDING_REVIEW" && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  提交人：{c.createdBy.name}
                </div>
              )}
            </div>
            {canAct && (
              <div className="flex flex-col items-end gap-1">
                {canReviewContacts && c.status === "PENDING_REVIEW" && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(c)}
                      className="h-7 gap-1 px-2 text-[11px] text-emerald-600 hover:text-emerald-700"
                    >
                      <Check className="h-3 w-3" />
                      通过
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(c)}
                      className="h-7 gap-1 px-2 text-[11px] text-destructive"
                    >
                      <XCircle className="h-3 w-3" />
                      驳回
                    </Button>
                  </div>
                )}
                {canEdit(c) && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(c)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-primary"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleArchive(c)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const EXT_CATEGORY_LABEL: Record<ExternalContactCategory, string> = {
  COURT: "法院",
  PROSECUTOR: "检察院",
  POLICE: "公安",
  NOTARY: "公证处",
  ARBITRATION: "仲裁",
  OTHER_FIRM: "他所律师",
  EXPERT: "鉴定专家",
  OTHER: "其他"
};
