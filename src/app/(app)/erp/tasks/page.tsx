"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import TaskList from "@/components/domain/erp/TaskList/TaskList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTasks } from "@/server/erp/actions";
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
        // Call server action directly from client
        const result = await listTasks({ page: 1, limit: 100 });
        setTasks(result.tasks as any); // cast to WorkTask[]
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
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
              Quản lý công việc, tiến độ và phân bổ nhân sự.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Thêm công việc
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
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
              className="border border-stone-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="TODO">Todo</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
              <option value="BLOCKED">Blocked</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="border border-stone-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="all">Tất cả ưu tiên</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        <TaskList tasks={filteredTasks} />
      </div>
    </main>
  );
}
