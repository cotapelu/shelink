"use client";

import { useEffect, useState } from "react";
import { Plus, Search, FolderOpen, Calendar, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listProjects } from "@/server/erp/actions";
import type { WorkTask } from "@/types";
// No Project type yet; using any for now

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PLANNING: "Kế hoạch",
    ACTIVE: "Đang thực hiện",
    ON_HOLD: "Tạm dừng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Hủy",
  };
  return labels[status] || status;
}

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    case "ON_HOLD":
      return "bg-yellow-100 text-yellow-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    default:
      return "bg-stone-100 text-stone-800";
  }
}

export default function ProjectsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const result = await listProjects();
        setProjects(result as any);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {filteredProjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-stone-500">
              Chưa có dự án nào. Tạo dự án đầu tiên!
            </div>
          ) : (
            filteredProjects.map((project) => (
              <Card key={project.id} className="bg-white/80 border-stone-200/60 shadow-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                  <CardDescription>{project.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-stone-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {project.startDate
                          ? new Date(project.startDate).toLocaleDateString("vi-VN")
                          : "Chưa bắt đầu"}
                        {project.endDate &&
                          ` - ${new Date(project.endDate).toLocaleDateString("vi-VN")}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>0 thành viên</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Chưa có công việc</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-stone-100 pt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Chi tiết
                  </Button>
                  <Button size="sm">Xem công việc</Button>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
