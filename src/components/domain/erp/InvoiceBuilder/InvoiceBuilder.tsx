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
import { Plus, Trash2, Download, Printer, Send, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax?: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  from: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  to: {
    name: string;
    address: string;
    email: string;
    phone?: string;
  };
  items: InvoiceItem[];
  notes?: string;
  taxRate?: number;
  discount?: number;
}

export interface InvoiceBuilderProps {
  initialData?: Partial<InvoiceData>;
  onSave?: (data: InvoiceData) => void;
  onExport?: (data: InvoiceData, format: 'pdf' | 'print') => void;
  className?: string;
}

const defaultInvoiceData: InvoiceData = {
  invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
  invoiceDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  from: {
    name: '',
    address: '',
    email: '',
    phone: '',
  },
  to: {
    name: '',
    address: '',
    email: '',
    phone: '',
  },
  items: [
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
  ],
  taxRate: 0,
  discount: 0,
};

export function InvoiceBuilder({
  initialData,
  onSave,
  onExport,
  className,
}: InvoiceBuilderProps) {
  const [invoice, setInvoice] = useState<InvoiceData>({
    ...defaultInvoiceData,
    ...initialData,
  });
  const [showPreview, setShowPreview] = useState(false);

  const addItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: String(Date.now()),
          description: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
    }));
  };

  const removeItem = (id: string) => {
    if (invoice.items.length > 1) {
      setInvoice((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const calculateSubtotal = () => {
    return invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const calculateTax = () => {
    return (calculateSubtotal() * (invoice.taxRate || 0)) / 100;
  };

  const calculateDiscount = () => {
    return invoice.discount || 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - calculateDiscount();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleSave = () => {
    onSave?.(invoice);
  };

  const handleExport = (format: 'pdf' | 'print') => {
    onExport?.(invoice, format);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">Invoice Builder</h2>
          <p className="text-stone-500 text-sm mt-1">Create and manage invoices</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showPreview ? 'primary' : 'outline'}
            onClick={() => setShowPreview(!showPreview)}
            
          >
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('print')}
            
          >
            Print
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            
          >
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
          >
            Save Invoice
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showPreview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="max-w-4xl mx-auto p-8 bg-white">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-stone-800">INVOICE</h1>
                  <p className="text-stone-500 mt-1">#{invoice.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-500">Date: {invoice.invoiceDate}</p>
                  <p className="text-sm text-stone-500">Due: {invoice.dueDate}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">From</h3>
                  <p className="font-semibold text-stone-800">{invoice.from.name}</p>
                  <p className="text-stone-600 text-sm whitespace-pre-line">{invoice.from.address}</p>
                  <p className="text-stone-600 text-sm">{invoice.from.email}</p>
                  {invoice.from.phone && <p className="text-stone-600 text-sm">{invoice.from.phone}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Bill To</h3>
                  <p className="font-semibold text-stone-800">{invoice.to.name}</p>
                  <p className="text-stone-600 text-sm whitespace-pre-line">{invoice.to.address}</p>
                  <p className="text-stone-600 text-sm">{invoice.to.email}</p>
                  {invoice.to.phone && <p className="text-stone-600 text-sm">{invoice.to.phone}</p>}
                </div>
              </div>

              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-stone-200">
                    <th className="text-left py-3 text-sm font-semibold text-stone-600">Description</th>
                    <th className="text-right py-3 text-sm font-semibold text-stone-600">Qty</th>
                    <th className="text-right py-3 text-sm font-semibold text-stone-600">Unit Price</th>
                    <th className="text-right py-3 text-sm font-semibold text-stone-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b border-stone-100">
                      <td className="py-3 text-stone-800">{item.description}</td>
                      <td className="py-3 text-right text-stone-600">{item.quantity}</td>
                      <td className="py-3 text-right text-stone-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right text-stone-800 font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Subtotal</span>
                    <span className="text-stone-800">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {invoice.taxRate && invoice.taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Tax ({invoice.taxRate}%)</span>
                      <span className="text-stone-800">{formatCurrency(calculateTax())}</span>
                    </div>
                  )}
                  {invoice.discount && invoice.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Discount</span>
                      <span className="text-green-600">-{formatCurrency(calculateDiscount())}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t-2 border-stone-200 pt-2">
                    <span className="text-stone-800">Total</span>
                    <span className="text-amber-600">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="mt-8 pt-8 border-t border-stone-200">
                  <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Notes</h3>
                  <p className="text-stone-600 text-sm">{invoice.notes}</p>
                </div>
              )}
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium leading-none">Invoice Number</label>
                    <Input
                      value={invoice.invoiceNumber}
                      onChange={(e) => setInvoice((prev) => ({ ...prev, invoiceNumber: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium leading-none">Invoice Date</label>
                    <Input
                      type="date"
                      value={invoice.invoiceDate}
                      onChange={(e) => setInvoice((prev) => ({ ...prev, invoiceDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium leading-none">Due Date</label>
                    <Input
                      type="date"
                      value={invoice.dueDate}
                      onChange={(e) => setInvoice((prev) => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>From</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Company Name"
                    value={invoice.from.name}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, from: { ...prev.from, name: e.target.value } }))}
                  />
                  <Input
                    placeholder="Address"
                    value={invoice.from.address}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, from: { ...prev.from, address: e.target.value } }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={invoice.from.email}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, from: { ...prev.from, email: e.target.value } }))}
                  />
                  <Input
                    placeholder="Phone"
                    value={invoice.from.phone || ''}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, from: { ...prev.from, phone: e.target.value } }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bill To</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Client Name"
                    value={invoice.to.name}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, to: { ...prev.to, name: e.target.value } }))}
                  />
                  <Input
                    placeholder="Address"
                    value={invoice.to.address}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, to: { ...prev.to, address: e.target.value } }))}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={invoice.to.email}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, to: { ...prev.to, email: e.target.value } }))}
                  />
                  <Input
                    placeholder="Phone"
                    value={invoice.to.phone || ''}
                    onChange={(e) => setInvoice((prev) => ({ ...prev, to: { ...prev.to, phone: e.target.value } }))}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Items</CardTitle>
                <Button size="sm" onClick={addItem} >
                  Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-3 p-3 bg-stone-50 rounded-lg"
                    >
                      <span className="text-sm text-stone-400 pt-3">{index + 1}.</span>
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        className="w-20"
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        className="w-32"
                      />
                      <div className="w-32 pt-3 text-right font-medium text-stone-800">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        disabled={invoice.items.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Subtotal</span>
                      <span data-testid="subtotal" className="text-stone-800">{formatCurrency(calculateSubtotal())}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-500">Tax Rate (%)</span>
                      <Input
                        type="number"
                        value={invoice.taxRate || 0}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, taxRate: Number(e.target.value) }))}
                        className="w-24 text-right"
                      />
                    </div>
                    {invoice.taxRate && invoice.taxRate > 0 && (
                      <div className="flex justify-between text-sm" data-testid="tax-row">
                        <span className="text-stone-500">Tax ({invoice.taxRate}%)</span>
                        <span data-testid="tax-amount" className="text-stone-800">{formatCurrency(calculateTax())}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-500">Discount</span>
                      <Input
                        type="number"
                        value={invoice.discount || 0}
                        onChange={(e) => setInvoice((prev) => ({ ...prev, discount: Number(e.target.value) }))}
                        className="w-24 text-right"
                      />
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t-2 border-stone-200 pt-2">
                      <span className="text-stone-800">Total</span>
                      <span data-testid="total" className="text-amber-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={3}
                  placeholder="Add any notes or payment terms..."
                  value={invoice.notes || ''}
                  onChange={(e) => setInvoice((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
