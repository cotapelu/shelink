'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/helpers';
import { InvoiceBuilderHeader } from './invoice-builder-header';
import { PartyInfoForm } from './party-info-form';
import { InvoiceMetadataForm } from './invoice-metadata-form';
import { InvoiceItemsTable } from './invoice-items-table';
import { InvoiceBuilderFooter } from './invoice-builder-footer';
import { InvoicePreview } from './invoice-preview';
import { Button } from '@/components/ui/button';

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
  from: { name: string; address: string; email: string; phone?: string };
  to: { name: string; address: string; email: string; phone?: string };
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
  from: { name: '', address: '', email: '', phone: '' },
  to: { name: '', address: '', email: '', phone: '' },
  items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }],
  taxRate: 0,
  discount: 0,
};

export function InvoiceBuilder({ initialData, onSave, onExport, className }: InvoiceBuilderProps) {
  const [invoice, setInvoice] = useState<InvoiceData>({ ...defaultInvoiceData, ...initialData });
  const [showPreview, setShowPreview] = useState(false);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const addItem = () => setInvoice(prev => ({ ...prev, items: [...prev.items, { id: String(Date.now()), description: '', quantity: 1, unitPrice: 0 }] }));
  const removeItem = (id: string) => { if (invoice.items.length > 1) setInvoice(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) })); };
  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => setInvoice(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, [field]: value } : i) }));

  const updateMetadata = (updates: Partial<Pick<InvoiceData, 'invoiceNumber' | 'invoiceDate' | 'dueDate' | 'taxRate' | 'discount' | 'notes'>>) => setInvoice(prev => ({ ...prev, ...updates }));
  const updateParty = (type: 'from' | 'to', party: Partial<InvoiceData['from']>) => setInvoice(prev => ({ ...prev, [type]: { ...prev[type], ...party } }));

  const subtotal = invoice.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tax = subtotal * (invoice.taxRate || 0) / 100;
  const discount = invoice.discount || 0;
  const total = subtotal + tax - discount;

  const handleSave = () => onSave?.(invoice);
  const handleExport = (format: 'pdf' | 'print') => onExport?.(invoice, format);

  return (
    <div className={cn('space-y-6', className)}>
      <InvoiceBuilderHeader />
      <div className="grid md:grid-cols-2 gap-6">
        <PartyInfoForm from={invoice.from} to={invoice.to} onFromChange={(f) => updateParty('from', f)} onToChange={(t) => updateParty('to', t)} />
        <InvoiceMetadataForm value={{ invoiceNumber: invoice.invoiceNumber, invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate, taxRate: invoice.taxRate || 0, discount: invoice.discount || 0, notes: invoice.notes }} onChange={updateMetadata} />
      </div>
      <InvoiceItemsTable items={invoice.items} onAdd={addItem} onRemove={removeItem} onUpdate={updateItem} />
      <InvoiceBuilderFooter onSave={handleSave} onExport={handleExport} />
      {showPreview && (
        <InvoicePreview data={invoice} formatCurrency={formatCurrency} subtotal={subtotal} tax={tax} discount={discount} total={total} />
      )}
      <div className="flex justify-end">
        <Button variant={showPreview ? 'default' : 'outline'} onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
    </div>
  );
}
