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

import { motion } from "framer-motion";
import { List, ListTree, Network } from "lucide-react";
import { useDashboard } from "@/components/layout/DashboardContext";

export type ViewMode = "list" | "tree" | "mindmap";

export default function ViewToggle() {
  const { view: currentView, setView } = useDashboard();

  const tabs = [
    { id: "list", label: "Danh sách", icon: <List className="size-4" /> },
    { id: "tree", label: "Sơ đồ cây", icon: <Network className="size-4" /> },
    { id: "mindmap", label: "Mindmap", icon: <ListTree className="size-4" /> },
  ] as const;

  return (
    <div className="flex bg-stone-200/50 p-1.5 rounded-full shadow-inner w-fit mx-auto mt-4 mb-2 relative border border-stone-200/60 backdrop-blur-sm z-10">
      {tabs.map((tab) => {
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as ViewMode)}
            className={`relative px-4 sm:px-6 py-1.5 sm:py-2.5 text-sm font-semibold rounded-full transition-colors duration-300 ease-in-out z-10 flex items-center gap-2 ${
              isActive
                ? "text-stone-900"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-white rounded-full shadow-sm border border-stone-200/60 z-[-1]"
                transition={{ type: "spring", stiffness: 450, damping: 30 }}
              />
            )}
            <span
              className={`transition-colors duration-300 ${isActive ? "text-amber-700" : "text-stone-400"}`}
            >
              {tab.icon}
            </span>
            <span className="tracking-wide">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
