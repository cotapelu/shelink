"use client";

import { useState } from "react";
import { Plus, Search, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectTimeline, type TimelineTask } from "@/components/domain/erp/ProjectTimeline";

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for timeline
  const mockTasks: TimelineTask[] = [
    { id: "1", name: "Khảo sát yêu cầu", startDate: "2025-01-01", endDate: "2025-01-10", progress: 100, status: "completed" },
    { id: "2", name: "Thiết kế hệ thống", startDate: "2025-01-11", endDate: "2025-01-25", progress: 100, status: "completed" },
    { id: "3", name: "Phát triển", startDate: "2025-01-26", endDate: "2025-02-28", progress: 60, status: "in_progress" },
    { id: "4", name: "Kiểm thử", startDate: "2025-03-01", endDate: "2025-03-15", progress: 0, status: "pending" },
    { id: "5", name: "Triển khai", startDate: "2025-03-16", endDate: "2025-03-31", progress: 0, status: "pending" },
  ];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Dự án
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Quản lý các dự án và theo dõi tiến độ.
            </p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 h-4 w-4" />
            Thêm dự án
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Tìm kiếm dự án..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/80"
          />
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder - will be replaced with real data from API */}
          <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <FolderOpen className="h-8 w-8 text-amber-600" />
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                Đang thực hiện
              </span>
            </div>
            <h3 className="font-bold text-lg mb-2">Dự án mẫu 1</h3>
            <p className="text-stone-500 text-sm mb-4">
              Mô tả ngắn về dự án này.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>5 công việc</span>
              <span>•</span>
              <span>2 thành viên</span>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-6 opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-start justify-between mb-4">
              <FolderOpen className="h-8 w-8 text-stone-400" />
              <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                Hoàn thành
              </span>
            </div>
            <h3 className="font-bold text-lg mb-2">Dự án mẫu 2</h3>
            <p className="text-stone-500 text-sm mb-4">
              Mô tả ngắn về dự án này.
            </p>
            <div className="flex items-center gap-2 text-xs text-stone-400">
              <span>12 công việc</span>
              <span>•</span>
              <span>4 thành viên</span>
            </div>
          </div>
        </div>

        {/* Timeline View Section */}
        <div className="mt-8 bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
          <h3 className="text-xl font-bold mb-6">Tiến độ dự án</h3>
          <ProjectTimeline tasks={mockTasks} />
        </div>
      </div>
    </main>
  );
}
