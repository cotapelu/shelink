"use client";
import type { ExternalContactItem } from "./contacts-types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalContactRowContent } from "./external-contact-row-content";
import { approveExternalContact, archiveExternalContact, rejectExternalContact } from "@/server/external-contacts/actions";

export function ExternalContactItemRow({ contact, currentUserId, currentUserRole, canReviewContacts, onEdit }: {
  contact: ExternalContactItem;
  currentUserId: string;
  currentUserRole: string;
  canReviewContacts: boolean;
  onEdit: (c: ExternalContactItem) => void;
}) {
  const router = useRouter();
  const canEdit = contact.createdBy.id === currentUserId || currentUserRole === "ADMIN" || currentUserRole === "PRINCIPAL_LAWYER";
  const canReview = canReviewContacts && contact.status === "PENDING_REVIEW";
  const handleApprove = async () => {
    if (!confirm(`通过联系人"${contact.name}"？`)) return;
    try { await approveExternalContact({ id: contact.id }); toast.success("已通过"); router.refresh(); }
    catch (err: any) { toast.error("审核失败", { description: err.message || "" }); }
  };
  const handleReject = async () => {
    const note = prompt(`驳回联系人"${contact.name}"的原因（可选）`);
    if (note === null) return;
    try { await rejectExternalContact({ id: contact.id, note }); toast.success("已驳回"); router.refresh(); }
    catch (err: any) { toast.error("审核失败", { description: err.message || "" }); }
  };
  const handleArchive = async () => {
    if (!confirm(`归档联系人"${contact.name}"？`)) return;
    try { await archiveExternalContact(contact.id); toast.success("已归档"); router.refresh(); }
    catch (err: any) { toast.error("归档失败", { description: err.message || "" }); }
  };
  return (
    <ExternalContactRowContent
      contact={contact}
      canEdit={canEdit}
      canReview={canReview}
      onEdit={() => onEdit(contact)}
      onApprove={handleApprove}
      onReject={handleReject}
      onArchive={handleArchive}
    />
  );
}
