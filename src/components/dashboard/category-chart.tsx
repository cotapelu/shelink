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

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type CategoryItem = { name: string; value: number; code: string; color: string };

export function CategoryChart({ data }: { data: CategoryItem[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="ll-surface flex h-full flex-col"
    >
      <header className="px-5 pb-3 pt-4">
        <h2 className="text-lg font-medium tracking-tight">案件类型分布</h2>
      </header>

      <div className="border-t border-border grid flex-1 grid-cols-5 items-center gap-3 p-4">
        <div className="relative col-span-2 h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                stroke="hsl(var(--card))"
                strokeWidth={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.code} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="ll-stat text-[2rem] leading-none text-foreground">
              {total}
            </span>
            <span className="mt-1 text-[10px] text-muted-foreground">总数</span>
          </div>
        </div>

        <ul className="col-span-3 space-y-0">
          {data.map((cat) => {
            const pct = Math.round((cat.value / total) * 100);
            return (
              <li
                key={cat.code}
                className="ll-row flex items-center gap-2.5 rounded-md px-2.5 py-1.5"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 truncate text-[0.82rem]">{cat.name}</span>
                <span className="font-mono text-xs tabular text-muted-foreground">
                  {cat.value}
                </span>
                <span className="w-9 text-right font-mono text-xs tabular text-muted-subtle">
                  {pct}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.section>
  );
}
