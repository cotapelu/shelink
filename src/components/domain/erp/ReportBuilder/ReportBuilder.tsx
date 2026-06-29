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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  FileSpreadsheet,
  Filter,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/Dropdown/Dropdown';

export interface ReportFilter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'date_range' | 'number' | 'multi_select';
  options?: { label: string; value: string }[];
  value?: string | string[] | { start: string; end: string };
}

export interface ReportConfig {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'comparative' | 'trend';
  filters: ReportFilter[];
  columns?: string[];
  groupBy?: string[];
}

export interface ReportData {
  id: string;
  title: string;
  description?: string;
  filters: ReportFilter[];
  data: Record<string, unknown>[];
  summary?: Record<string, number>;
  generatedAt?: string;
}

export interface ReportBuilderProps {
  reportTypes?: { type: string; label: string; icon: React.ReactNode }[];
  availableFilters?: ReportFilter[];
  onGenerate?: (config: ReportConfig) => void;
  onExport?: (report: ReportData, format: 'csv' | 'excel' | 'pdf') => void;
  className?: string;
}

const defaultReportTypes = [
  { type: 'summary', label: 'Summary Report', icon: <BarChart3 className="w-4 h-4" /> },
  { type: 'detailed', label: 'Detailed Report', icon: <FileSpreadsheet className="w-4 h-4" /> },
  { type: 'comparative', label: 'Comparative Report', icon: <PieChart className="w-4 h-4" /> },
  { type: 'trend', label: 'Trend Analysis', icon: <LineChart className="w-4 h-4" /> },
];

const presetDateRanges = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last_7_days' },
  { label: 'Last 30 days', value: 'last_30_days' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom', value: 'custom' },
];

export function ReportBuilder({
  reportTypes = defaultReportTypes,
  availableFilters = [],
  onGenerate,
  onExport,
  className,
}: ReportBuilderProps) {
  const [selectedType, setSelectedType] = useState(reportTypes[0].type);
  const [filters, setFilters] = useState<ReportFilter[]>(availableFilters);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const updateFilter = (filterId: string, value: ReportFilter['value']) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === filterId ? { ...f, value } : f))
    );
  };

  const addFilter = (filter: ReportFilter) => {
    setFilters((prev) => [...prev, filter]);
  };

  const removeFilter = (filterId: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterId));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    const config: ReportConfig = {
      id: String(Date.now()),
      name: reportTypes.find((r) => r.type === selectedType)?.label || 'Report',
      type: selectedType as ReportConfig['type'],
      filters,
    };

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const mockData: Record<string, unknown>[] = [];
    for (let i = 0; i < 10; i++) {
      mockData.push({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 10000),
        status: ['Active', 'Inactive', 'Pending'][Math.floor(Math.random() * 3)],
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    const report: ReportData = {
      id: config.id,
      title: config.name,
      filters,
      data: mockData,
      summary: {
        total: mockData.length,
        active: mockData.filter((d) => d.status === 'Active').length,
        inactive: mockData.filter((d) => d.status === 'Inactive').length,
        pending: mockData.filter((d) => d.status === 'Pending').length,
      },
      generatedAt: new Date().toISOString(),
    };

    setGeneratedReport(report);
    onGenerate?.(config);
    setIsGenerating(false);
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (generatedReport) {
      onExport?.(generatedReport, format);
    }
  };

  const renderFilterInput = (filter: ReportFilter) => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            placeholder={`Filter by ${filter.label}`}
            value={(filter.value as string) || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <select
            className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            value={(filter.value as string) || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
          >
            <option value="">All {filter.label}</option>
            {filter.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={(filter.value as string) || ''}
            onChange={(e) => updateFilter(filter.id, e.target.value)}
          />
        );

      case 'date_range':
        return (
          <div className="flex gap-2">
            <Input
              type="date"
              value={(filter.value as { start: string })?.start || ''}
              onChange={(e) =>
                updateFilter(filter.id, {
                  start: e.target.value,
                  end: (filter.value as { end: string })?.end || '',
                })
              }
            />
            <Input
              type="date"
              value={(filter.value as { end: string })?.end || ''}
              onChange={(e) =>
                updateFilter(filter.id, {
                  start: (filter.value as { start: string })?.start || '',
                  end: e.target.value,
                })
              }
            />
          </div>
        );

      case 'multi_select':
        return (
          <div className="flex flex-wrap gap-1">
            {filter.options?.map((opt) => {
              const selected = Array.isArray(filter.value) && filter.value.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const current = Array.isArray(filter.value) ? filter.value : [];
                    const newValue = selected
                      ? current.filter((v) => v !== opt.value)
                      : [...current, opt.value];
                    updateFilter(filter.id, newValue);
                  }}
                  className={cn(
                    'px-2 py-1 text-xs rounded-full border transition-colors',
                    selected
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Report Builder</h2>
          <p className="text-stone-500 text-sm mt-1">Create custom reports with filters</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            
          >
            Filters
          </Button>
          {generatedReport && (
            <Dropdown
              trigger={
                <Button >
                  Export
                </Button>
              }
            >
              <DropdownLabel>Export Format</DropdownLabel>
              <DropdownItem onClick={() => handleExport('csv')}>CSV</DropdownItem>
              <DropdownItem onClick={() => handleExport('excel')}>Excel</DropdownItem>
              <DropdownItem onClick={() => handleExport('pdf')}>PDF</DropdownItem>
            </Dropdown>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reportTypes.map((type) => (
                  <button
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      selectedType === type.type
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'hover:bg-stone-50 text-stone-600 border border-transparent'
                    )}
                  >
                    {type.icon}
                    <span className="text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {showFilters && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Filters</CardTitle>
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  }
                >
                  <DropdownLabel>Add Filter</DropdownLabel>
                  {availableFilters
                    .filter((f) => !filters.find((cf) => cf.id === f.id))
                    .map((filter) => (
                      <DropdownItem
                        key={filter.id}
                        onClick={() => addFilter({ ...filter, value: undefined })}
                      >
                        {filter.label}
                      </DropdownItem>
                    ))}
                </Dropdown>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {presetDateRanges.map((range) => (
                    <button
                      key={range.value}
                      className="px-2 py-1 text-xs bg-stone-100 hover:bg-stone-200 rounded-full text-stone-600 transition-colors"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {filters.map((filter) => (
                    <motion.div
                      key={filter.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-stone-600">
                          {filter.label}
                        </label>
                        <button
                          onClick={() => removeFilter(filter.id)}
                          className="p-1 hover:bg-stone-100 rounded"
                        >
                          <X className="w-3 h-3 text-stone-400" />
                        </button>
                      </div>
                      {renderFilterInput(filter)}
                    </motion.div>
                  ))}
                </AnimatePresence>

                <Button
                  className="w-full mt-4"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {generatedReport ? (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{generatedReport.title}</CardTitle>
                      <p className="text-sm text-stone-500 mt-1">
                        Generated at: {new Date(generatedReport.generatedAt || '').toLocaleString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {generatedReport.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {Object.entries(generatedReport.summary).map(([key, value]) => (
                          <div
                            key={key}
                            className="bg-stone-50 rounded-lg p-4 text-center"
                          >
                            <p className="text-2xl font-bold text-stone-800">{value}</p>
                            <p className="text-xs text-stone-500 uppercase">{key}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-stone-50 border-b border-stone-200">
                          <tr>
                            {generatedReport.data.length > 0 &&
                              Object.keys(generatedReport.data[0]).map((key) => (
                                <th
                                  key={key}
                                  className="px-4 py-2 text-left text-xs font-semibold text-stone-600 uppercase"
                                >
                                  {key}
                                </th>
                              ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {generatedReport.data.map((row, idx) => (
                            <motion.tr
                              key={idx}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.03 }}
                            >
                              {Object.values(row).map((val, i) => (
                                <td key={i} className="px-4 py-3 text-sm text-stone-600">
                                  {typeof val === 'boolean' ? (
                                    <Badge variant={val ? 'green' : 'red'}>
                                      {val ? 'Yes' : 'No'}
                                    </Badge>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="min-h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <FileSpreadsheet className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-stone-600 mb-2">
                      No Report Generated
                    </h3>
                    <p className="text-stone-500 text-sm mb-4">
                      Select a report type and add filters, then click Generate
                    </p>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                      {isGenerating ? 'Generating...' : 'Generate Sample Report'}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Plus(props: { className?: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
