/*
 * Copyright 2026 叶森 (Sen Ye) - Original work (MIT Licensed)
 * Copyright 2026 COTAPELU - Modifications and additions (Apache 2.0 Licensed)
 *
 * This file contains modifications to the original MIT-licensed work.
 *
 * The original work was licensed under MIT License (see below):
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Modifications in this file are licensed under the Apache License, Version 2.0.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ORIGINAL MIT LICENSE TEXT:
 * ==========================
 * MIT License
 *
 * Copyright (c) 2026 叶森 (Sen Ye)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"use client";

import MemberDetailContent from "@/components/domain/genealogy/members/MemberDetailContent";
import MemberForm from "@/components/domain/genealogy/members/MemberForm";
import { Person } from "@/types";
import api from "@/lib/api/client";
import API_ENDPOINTS from "@/lib/api/endpoints";
import { getToken } from "@/lib/storage/auth";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Edit2, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/components/layout/DashboardContext";

export default function MemberDetailModal() {
  const { memberModalId: memberId, setMemberModalId } = useDashboard();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.setToken(token);
    }
  }, []);

  const closeModal = () => {
    setMemberModalId(null);
    setIsEditing(false);
  };

  const fetchData = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        let currentIsAdmin = isAdmin;
        let currentCanEdit = canEdit;
        if (!authChecked) {
          const authResult = await api.get<{ user: { id: string }; role: string }>(
            API_ENDPOINTS.AUTH.ME,
          );
          if (authResult.data?.user) {
            currentIsAdmin = authResult.data.role === "admin";
            currentCanEdit =
              authResult.data.role === "admin" ||
              authResult.data.role === "editor";
            setIsAdmin(currentIsAdmin);
            setCanEdit(currentCanEdit);
          }
          setAuthChecked(true);
        }

        const personResult = await api.get<Person>(
          API_ENDPOINTS.PERSON_BY_ID(id),
        );

        if (personResult.error || !personResult.data) {
          throw new Error("Không thể tải thông tin thành viên.");
        }
        setPerson(personResult.data);

        if (currentIsAdmin) {
          const privResult = await api.get<Record<string, unknown>>(
            `/person-details-private/${id}`,
          );
          setPrivateData(privResult.data || {});
        }
      } catch (err) {
        console.error("Error fetching member details:", err);
        setError(
          err instanceof Error ? err.message : "Đã xảy ra lỗi hệ thống.",
        );
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, canEdit, authChecked],
  );

  // Sync state with URL parameter
  useEffect(() => {
    if (memberId) {
      setIsOpen(true);
      setIsEditing(false); // always start on detail view when opening
      fetchData(memberId);
    } else {
      setIsOpen(false);
      setTimeout(() => {
        setPerson(null);
        setPrivateData(null);
        setError(null);
        setIsEditing(false);
      }, 300);
    }
  }, [memberId, fetchData]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Called by MemberForm after a successful save
  const handleEditSuccess = (savedPersonId: string) => {
    // Clear stale data first so the loading state is shown while refetching
    setIsEditing(false);
    setPerson(null);
    setPrivateData(null);
    fetchData(savedPersonId);
    // Revalidate Next.js server component cache so the dashboard list/tree updates
    router.refresh();
  };

  // initialData for MemberForm — merge public + private
  const formInitialData = person
    ? { ...person, ...(privateData ?? {}) }
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm"
        >
          {/* Click-away backdrop (disabled while editing to avoid accidental close) */}
          {!isEditing && (
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={closeModal}
            />
          )}

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            {/* Sticky Header Actions */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {isEditing ? (
                /* In edit mode — show "Back to detail" button */
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span className="hidden sm:inline">Xem chi tiết</span>
                </button>
              ) : (
                canEdit &&
                person && (
                  <>
                    <Link
                      href={`/dashboard/members/${person.id}`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                    >
                      <ExternalLink className="size-4" />
                      <span className="hidden sm:inline">Xem chi tiết</span>
                    </Link>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors"
                    >
                      <Edit2 className="size-4" />
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </button>
                  </>
                )
              )}
              <button
                onClick={closeModal}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4">
                <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-stone-500 font-medium">Đang tải...</p>
              </div>
            ) : error ? (
              <div className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                  <AlertCircle className="size-8" />
                </div>
                <p className="text-red-600 font-medium text-lg">{error}</p>
                <button
                  onClick={closeModal}
                  className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors"
                >
                  Đóng
                </button>
              </div>
            ) : isEditing && formInitialData ? (
              /* ── EDIT MODE ── */
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                  Chỉnh sửa thành viên
                </h2>
                <MemberForm
                  initialData={
                    formInitialData as Parameters<
                      typeof MemberForm
                    >[0]["initialData"]
                  }
                  isEditing={true}
                  isAdmin={isAdmin}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setIsEditing(false)}
                />
              </div>
            ) : person ? (
              /* ── DETAIL MODE ── */
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <MemberDetailContent
                  person={person}
                  privateData={privateData}
                  isAdmin={isAdmin}
                  canEdit={canEdit}
                />
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
