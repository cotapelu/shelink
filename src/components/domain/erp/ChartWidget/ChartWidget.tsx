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
'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { Download, Maximize2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem, DropdownLabel } from '@/components/Dropdown/Dropdown';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export type ChartType = 'bar' | 'line' | 'pie' | 'area';

export interface ChartData {
  name: string;
  value?: number;
  [key: string]: string | number | undefined;
}

export interface ChartSeries {
  key: string;
  color: string;
  name?: string;
}

export interface ChartWidgetProps {
  title?: string;
  data: ChartData[];
  type?: ChartType;
  series?: ChartSeries[];
  xAxisKey?: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  animate?: boolean;
  colors?: string[];
  onExport?: (format: 'png' | 'svg') => void;
  className?: string;
}

const defaultColors = [
  '#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
];

export function ChartWidget({
  title,
  data,
  type = 'bar',
  series = [],
  xAxisKey = 'name',
  height = 300,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  animate = true,
  colors = defaultColors,
  onExport,
  className,
}: ChartWidgetProps) {
  const [chartType, setChartType] = useState<ChartType>(type);

  const renderChart = (): React.ReactElement | null => {
    const commonProps = {
      data,
    };

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={xAxisKey} stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} />
            {showTooltip && <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />}
            {showLegend && <Legend />}
            {series.length > 0
              ? series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name || s.key}
                    fill={s.color || colors[i % colors.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))
              : <Bar dataKey="value" fill={colors[0]} radius={[4, 4, 0, 0]} />}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={xAxisKey} stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} />
            {showTooltip && <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />}
            {showLegend && <Legend />}
            {series.length > 0
              ? series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name || s.key}
                    stroke={s.color || colors[i % colors.length]}
                    strokeWidth={2}
                    dot={{ fill: s.color || colors[i % colors.length], strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                ))
              : <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2} dot={{ fill: colors[0] }} />}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
            <XAxis dataKey={xAxisKey} stroke="#78716c" fontSize={12} />
            <YAxis stroke="#78716c" fontSize={12} />
            {showTooltip && <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />}
            {showLegend && <Legend />}
            {series.length > 0
              ? series.map((s, i) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name || s.key}
                    stroke={s.color || colors[i % colors.length]}
                    fill={s.color || colors[i % colors.length]}
                    fillOpacity={0.3}
                  />
                ))
              : <Area type="monotone" dataKey="value" stroke={colors[0]} fill={colors[0]} fillOpacity={0.3} />}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            {showTooltip && <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />}
            {showLegend && <Legend />}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={height / 2 - 20}
              dataKey={series.length > 0 ? series[0].key : 'value'}
              nameKey={xAxisKey}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          {title && <CardTitle>{title}</CardTitle>}
          <div className="flex items-center gap-2">
            <Dropdown
              trigger={
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              }
            >
              <DropdownLabel>Chart Type</DropdownLabel>
              <DropdownItem onClick={() => setChartType('bar')}>Bar</DropdownItem>
              <DropdownItem onClick={() => setChartType('line')}>Line</DropdownItem>
              <DropdownItem onClick={() => setChartType('area')}>Area</DropdownItem>
              <DropdownItem onClick={() => setChartType('pie')}>Pie</DropdownItem>
            </Dropdown>
            {onExport && (
              <Dropdown
                trigger={
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                }
              >
                <DropdownLabel>Export</DropdownLabel>
                <DropdownItem onClick={() => onExport('png')}>PNG</DropdownItem>
                <DropdownItem onClick={() => onExport('svg')}>SVG</DropdownItem>
              </Dropdown>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={animate ? { opacity: 0 } : undefined}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height={height}>
            {renderChart() || <></>}
          </ResponsiveContainer>
        </motion.div>
      </CardContent>
    </Card>
  );
}
