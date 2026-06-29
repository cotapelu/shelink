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
import { getSession } from "@/lib/auth/session";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";
import {
  getDashboardKpis,
  getDashboardRevenueTrend,
  getDashboardCategoryDistribution,
  getDashboardSchedule,
  getDashboardHeroData
} from "@/server/dashboard/actions";

export default async function DashboardPage() {
  const session = await getSession();

  const [kpis, revenueTrend, categoryDistribution, scheduleItems, hero] =
    await Promise.all([
      getDashboardKpis(),
      getDashboardRevenueTrend(),
      getDashboardCategoryDistribution(),
      getDashboardSchedule(),
      getDashboardHeroData()
    ]);

  return (
    <div className="space-y-5 pb-8">
      {/* v0.47：顶部问候区 + 右侧近期日程 */}
      <DashboardGreeting
        name={session?.user?.name ?? ""}
        summary={{
          todayDeadlineCount: hero.todayDeadlineCount,
          weekHearingCount: hero.weekHearingCount,
          nearTermCount: hero.nearTermCount
        }}
        scheduleItems={scheduleItems}
      />

      <div className="ll-rule" />

      <KpiCards data={kpis} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart data={revenueTrend} />
        </div>
        <div className="lg:col-span-2">
          <CategoryChart data={categoryDistribution} />
        </div>
      </div>
    </div>
  );
}
