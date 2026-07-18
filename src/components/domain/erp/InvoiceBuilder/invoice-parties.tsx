"use client";

interface Party {
  name: string;
  address: string;
  email: string;
  phone?: string;
}

interface InvoicePartiesProps {
  from: Party;
  to: Party;
}

export function InvoiceParties({ from, to }: InvoicePartiesProps) {
  return (
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div>
        <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">From</h3>
        <p className="font-semibold text-stone-800">{from.name}</p>
        <p className="text-stone-600 text-sm whitespace-pre-line">{from.address}</p>
        <p className="text-stone-600 text-sm">{from.email}</p>
        {from.phone && <p className="text-stone-600 text-sm">{from.phone}</p>}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-500 uppercase mb-2">Bill To</h3>
        <p className="font-semibold text-stone-800">{to.name}</p>
        <p className="text-stone-600 text-sm whitespace-pre-line">{to.address}</p>
        <p className="text-stone-600 text-sm">{to.email}</p>
        {to.phone && <p className="text-stone-600 text-sm">{to.phone}</p>}
      </div>
    </div>
  );
}
