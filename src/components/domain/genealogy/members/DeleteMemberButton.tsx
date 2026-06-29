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

import { deleteMemberProfile } from "@/app/actions/member";
import { AlertCircle, X } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";

interface DeleteMemberButtonProps {
  memberId: string;
}

export default function DeleteMemberButton({
  memberId,
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
      const result = await deleteMemberProfile(memberId) as { error?: string } | undefined;
      if (result?.error) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }
      // Note: the server action will redirect on success
    } catch (err) {
      if (isRedirectError(err)) {
        throw err;
      }
      console.error("Delete failed:", err);
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi xoá hồ sơ.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isDeleting ? "Đang xoá..." : "Xoá hồ sơ"}
      </button>

      {error && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-2 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 pr-4">{error}</div>
            <button
              onClick={() => setError(null)}
              className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
