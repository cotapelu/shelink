'use client';

import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { IntakeCreateInput } from '@/server/intakes/schemas';
import type { MatterCategory, ProcedureType, FeeType, BarFilingType, LitigationStanding } from '@prisma/client';

function watchField<T>(control: Control<IntakeCreateInput>, name: keyof IntakeCreateInput, def: T) {
  return (useWatch({ control, name }) ?? def) as T;
}

/**
 * Aggregates all watched form fields for the intake creation form.
 * Centralizes form state access and reduces repetitive `useWatch` calls.
 */
export function useIntakeFormStates(control: Control<IntakeCreateInput>) {
  return {
    category: watchField(control, "category", 'CIVIL_COMMERCIAL') as MatterCategory,
    firstProcedureType: useWatch({ control, name: "firstProcedureType" }) as ProcedureType | undefined,
    clientId: watchField(control, "clientId", "") as string,
    feeType: useWatch({ control, name: "feeType" }) as FeeType | undefined,
    ownerUserId: useWatch({ control, name: "ownerUserId" }) as string | undefined,
    coUserIds: useWatch({ control, name: "coUserIds" }) as string[],
    receivedAt: useWatch({ control, name: "receivedAt" }) as Date | undefined,
    jurisdiction: watchField(control, "jurisdiction", "") as string,
    firstAgency: useWatch({ control, name: "firstAgency" }) as string | undefined,
    barFiling: useWatch({ control, name: "barFiling" }) as BarFilingType | undefined,
    counterclaim: useWatch({ control, name: "counterclaim" }) as boolean | undefined,
    ourStanding: useWatch({ control, name: "ourStanding" }) as LitigationStanding | undefined,
    businessType: useWatch({ control, name: "businessType" }) as string | undefined,
    serviceStart: useWatch({ control, name: "serviceStart" }) as string | undefined,
    serviceEnd: useWatch({ control, name: "serviceEnd" }) as string | undefined,
    counselType: useWatch({ control, name: "counselType" }) as string | undefined,
    parties: useWatch({ control, name: "parties" }) as any[],
    title: useWatch({ control, name: "title" }) as string | undefined,
    causeFreeText: useWatch({ control, name: "causeFreeText" }) as string | undefined,
    claimAmount: useWatch({ control, name: "claimAmount" }) as number | undefined,
    claimDescription: useWatch({ control, name: "claimDescription" }) as string | undefined,
    causeId: useWatch({ control, name: "causeId" }) as string | undefined,
  };
}
