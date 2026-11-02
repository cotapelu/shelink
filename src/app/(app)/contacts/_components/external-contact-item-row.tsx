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
    if (!confirm(`Duyệt liên hệ "${contact.name}"?`)) return;
    try { await approveExternalContact({ id: contact.id }); toast.success("Đã duyệt"); router.refresh(); }
    catch (err: any) { toast.error("Duyệt thất bại", { description: err.message || "" }); }
  };
  const handleReject = async () => {
    const note = prompt(`Lý do từ chối liên hệ "${contact.name}" (tuỳ chọn)`);
    if (note === null) return;
    try { await rejectExternalContact({ id: contact.id, note }); toast.success("Đã từ chối"); router.refresh(); }
    catch (err: any) { toast.error("Duyệt thất bại", { description: err.message || "" }); }
  };
  const handleArchive = async () => {
    if (!confirm(`Lưu trữ liên hệ "${contact.name}"?`)) return;
    try { await archiveExternalContact(contact.id); toast.success("Đã lưu trữ"); router.refresh(); }
    catch (err: any) { toast.error("Lưu trữ thất bại", { description: err.message || "" }); }
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
