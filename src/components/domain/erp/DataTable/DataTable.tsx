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
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Eye,
  EyeOff,
  Filter,
  Printer,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from '@/components/Dropdown/Dropdown';

export type DataTableColumn<T> = ColumnDef<T> & {
  filterable?: boolean;
  filterVariant?: 'text' | 'select' | 'date' | 'number' | 'range';
  filterOptions?: { label: string; value: string }[];
};

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  exportable?: boolean;
  printable?: boolean;
  columnVisibilityable?: boolean;
  onExport?: (format: 'csv' | 'excel' | 'json') => void;
  onPrint?: () => void;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  filterable = true,
  exportable = true,
  printable = true,
  columnVisibilityable = true,
  onExport,
  onPrint,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const filterableColumns = columns.filter((col) => col.filterable);

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<T>[],
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const exportToCSV = () => {
    const headers = table.getVisibleLeafColumns().map((col) => col.id);
    const rows = table.getRowModel().rows.map((row) =>
      headers.map((header) => {
        const value = row.getValue(header);
        return typeof value === 'string' ? `"${value}"` : value;
      })
    );
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = () => {
    const json = JSON.stringify(table.getRowModel().rows.map((row) => row.original), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'csv' | 'excel' | 'json') => {
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'json') {
      exportToJSON();
    } else if (onExport) {
      onExport(format);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  const clearAllFilters = () => {
    setColumnFilters([]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {searchable && (
            <div className="relative">
              <div className="flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-stone-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              {globalFilter && (
                <button
                  data-testid="clear-search-button"
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          {filterable && filterableColumns.length > 0 && (
            <Button
              variant={showFilters ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {columnFilters.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {columnFilters.length}
                </span>
              )}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {exportable && (
            <Dropdown
              trigger={
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              }
            >
              <DropdownLabel>Export Format</DropdownLabel>
              <DropdownItem onClick={() => handleExport('csv')}>CSV</DropdownItem>
              <DropdownItem onClick={() => handleExport('json')}>JSON</DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={() => handleExport('excel')}>Excel</DropdownItem>
            </Dropdown>
          )}
          {printable && (
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )}
          {columnVisibilityable && (
            <Dropdown
              trigger={
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Columns
                </Button>
              }
            >
              <DropdownLabel>Toggle Columns</DropdownLabel>
              {table.getAllLeafColumns().map((column) => {
                const colDef = column.columnDef as DataTableColumn<T>;
                return (
                  <DropdownItem
                    key={column.id}
                    onClick={() => column.toggleVisibility()}
                    className="flex items-center gap-2"
                  >
                    {column.getIsVisible() ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {typeof colDef.header === 'string' ? colDef.header : column.id}
                  </DropdownItem>
                );
              })}
            </Dropdown>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && filterableColumns.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filterableColumns.map((column) => {
                  const colDef = column as DataTableColumn<T>;
                  const filterVariant = colDef.filterVariant || 'text';
const col = table.getColumn(column.id || '');
                const columnFilterValue = col?.getFilterValue() as string | undefined;

                return (
                  <div key={column.id || ''}>
                      {filterVariant === 'select' && colDef.filterOptions ? (
                        <select
                          value={columnFilterValue ?? ''}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            if (newVal) {
                              col?.setFilterValue(newVal);
                            } else {
                              col?.setFilterValue(undefined);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        >
                          <option value="">All</option>
                          {colDef.filterOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          placeholder={`Filter ${typeof colDef.header === 'string' ? colDef.header : column.id}`}
                          value={columnFilterValue ?? ''}
                          onChange={(e) => {
                            const newVal = e.target.value;
                            if (newVal) {
                              col?.setFilterValue(newVal);
                            } else {
                              col?.setFilterValue(undefined);
                            }
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {columnFilters.length > 0 && (
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-stone-200 overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const colDef = header.column.columnDef as DataTableColumn<T>;
                    return (
                      <th
                        key={header.id}
                        className={cn(
                          'px-4 py-3 text-left text-sm font-semibold text-stone-700',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:bg-stone-100'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(colDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-stone-400">
                              {{
                                asc: <ChevronUp className="w-4 h-4" />,
                                desc: <ChevronDown className="w-4 h-4" />,
                              }[header.column.getIsSorted() as string] ?? <ChevronsUpDown className="w-4 h-4" />}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-stone-100">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-stone-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-stone-50/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm text-stone-600">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <span>Showing</span>
          <strong>
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}
          </strong>
          <span>of</span>
          <strong>{table.getFilteredRowModel().rows.length}</strong>
          <span>results</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm text-stone-600">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
