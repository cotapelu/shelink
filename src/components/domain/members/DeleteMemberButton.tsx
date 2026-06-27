'use client';

import { deleteMemberProfile } from "@/app/actions/member";
import { AlertCircle, X } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";

interface DeleteMemberButtonProps {
  memberId: string;
  onSuccess?: () => void;
}

export default function DeleteMemberButton({
  memberId,
  onSuccess,
}: DeleteMemberButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xoá hồ sơ này không? Hành động này không thể hoàn tác.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteMemberProfile(memberId);
      onSuccess?.();
    } catch (err: any) {
      if (isRedirectError(err)) throw err;
      setError(err.message || 'Xóa thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 py-2"
      >
        {isDeleting ? 'Đang xóa...' : 'Xóa hồ sơ'}
      </button>
      {error && (
        <p className="text-sm text-destructive mt-2 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </>
  );
}
