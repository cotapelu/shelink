"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import TaskList from "@/components/domain/erp/TaskList/TaskList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { WorkTask } from "@/types";

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // TODO: Replace with server actions after backend migration
        const response = await api.get<WorkTask[]>(API_ENDPOINTS.TASKS_LIST || "/tasks");
        setTasks(response.data || []);
      } catch (error) {
        console.error("Failed to fetch tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
        <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8">
          <p className="text-stone-500">Đang tải...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Công việc
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Quản lý và theo dõi các công việc trong dự án.
            </p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 h-4 w-4" />
            Thêm công việc
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                placeholder="Tìm kiếm công việc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="TODO">Chưa làm</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="REVIEW">Đánh giá</option>
                <option value="DONE">Hoàn thành</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Tất cả độ ưu tiên</option>
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="CRITICAL">Khẩn cấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
          <TaskList tasks={filteredTasks} />
        </div>
      </div>
    </main>
  );
}
