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

import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { ViewMode } from "@/components/ViewToggle";

interface DashboardState {
  memberModalId: string | null;
  setMemberModalId: (id: string | null) => void;
  showAvatar: boolean;
  setShowAvatar: (show: boolean) => void;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  rootId: string | null;
  setRootId: (id: string | null) => void;
}

export const DashboardContext = createContext<DashboardState | undefined>(
  undefined,
);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [memberModalId, setMemberModalId] = useState<string | null>(null);
  const [showAvatar, setShowAvatar] = useState<boolean>(true);
  const [view, setViewState] = useState<ViewMode>("list");
  const [rootId, setRootIdState] = useState<string | null>(null);

  // Initialize from URL once on mount (or when searchParams actually change from server init)
  // We use a ref or just simple effect
  useEffect(() => {
    const avatarParam = searchParams.get("avatar");
    setShowAvatar(avatarParam !== "hide");

    const viewParam = searchParams.get("view") as ViewMode;
    if (viewParam) setViewState(viewParam);

    const rootIdParam = searchParams.get("rootId");
    if (rootIdParam) setRootIdState(rootIdParam);

    // We intentionally ignore memberModalId in the Next.js router loop
    // to avoid Next.js triggering re-renders on push.
    // If the URL has it on first load, we grab it from window.location instead
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const modalId = sp.get("memberModalId");
      if (modalId && !memberModalId) {
        setMemberModalId(modalId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to URL silently
  const updateModalId = (id: string | null) => {
    setMemberModalId(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("memberModalId", id);
      } else {
        newUrl.searchParams.delete("memberModalId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const updateAvatar = (show: boolean) => {
    setShowAvatar(show);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (!show) {
        newUrl.searchParams.set("avatar", "hide");
      } else {
        newUrl.searchParams.delete("avatar");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setView = (v: ViewMode) => {
    setViewState(v);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("view", v);
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  const setRootId = (id: string | null) => {
    setRootIdState(id);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("rootId", id);
      } else {
        newUrl.searchParams.delete("rootId");
      }
      window.history.replaceState(null, "", newUrl.toString());
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        memberModalId,
        setMemberModalId: updateModalId,
        showAvatar,
        setShowAvatar: updateAvatar,
        view,
        setView,
        rootId,
        setRootId,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard(): DashboardState {
  const context = useContext(DashboardContext);
  // Return a safe no-op fallback when used outside DashboardProvider
  // (e.g., on the /dashboard/members/[id] standalone page)
  if (context === undefined) {
    return {
      memberModalId: null,
      setMemberModalId: () => {},
      showAvatar: true,
      setShowAvatar: () => {},
      view: "list",
      setView: () => {},
      rootId: null,
      setRootId: () => {},
    };
  }
  return context;
}
