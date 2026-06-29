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
