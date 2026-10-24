import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getContract } from "@/server/contracts/actions";
import { ContractActions } from "../_components/contract-actions";
import { ContractStatusStepper } from "../_components/contract-status-stepper";
import { ContractEvents } from "../_components/contract-events";
import { ContractHeader } from "../_components/contract-header";
import { ContractTerms } from "../_components/contract-terms";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const contract = await getContract(id).catch(() => null);
  if (!contract) notFound();

  return (
    <div className="space-y-5 max-w-4xl">
      <header className="flex items-start justify-between gap-4">
        <ContractHeader
          title={contract.title}
          code={contract.code}
          status={contract.status}
          expiresAt={contract.expiresAt}
          renewRemindDays={contract.renewRemindDays}
          clientId={contract.client.id}
          clientName={contract.client.name}
          quote={contract.quote ? { id: contract.quote.id, code: contract.quote.code } : null}
        />
        <ContractActions id={contract.id} status={contract.status} />
      </header>

      <ContractStatusStepper
        status={contract.status}
        events={contract.events.map((e) => ({ kind: e.kind, occurredAt: e.occurredAt }))}
      />

      <ContractTerms
        amount={Number(contract.amount)}
        currency={contract.currency}
        signedAt={contract.signedAt}
        expiresAt={contract.expiresAt}
        scope={contract.scope}
        paymentTerms={contract.paymentTerms}
      />

      <ContractEvents
        events={contract.events.map((e) => ({
          id: e.id,
          kind: e.kind,
          detail: e.detail,
          occurredAt: e.occurredAt,
          actorName: (e.actorUser as { name?: string | null } | null)?.name ?? null
        }))}
      />
    </div>
  );
}
