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

import { useEffect, useState } from "react";
import { CalendarDays, Kanban, FolderOpen, BarChart3, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/server/erp/actions";

export default function ERPDashboardPage() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalProjects: 0,
    overdueTasks: 0,
    activeTeams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data as any);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
            ERP Dashboard
          </h2>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            Quản lý dự án, công việc và nhóm làm việc.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng công việc</CardTitle>
              <Kanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.totalTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Dự án</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.totalProjects}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quá hạn</CardTitle>
              <CalendarDays className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{loading ? "..." : stats.overdueTasks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Nhóm</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats.activeTeams}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/erp/tasks" className="group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Kanban className="h-5 w-5" />
                  Công việc
                </CardTitle>
                <CardDescription>Quản lý task, kanban board</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/erp/tasks/board" className="group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Bảng Kanban
                </CardTitle>
                <CardDescription>Drag & drop trạng thái</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/erp/projects" className="group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Dự án
                </CardTitle>
                <CardDescription>Quản lý dự án và tiến độ</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </main>
  );
}
