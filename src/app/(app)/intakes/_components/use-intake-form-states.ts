'use client';

import { useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { IntakeCreateInput } from '@/server/intakes/schemas';

/**
 * Hook that aggregates all watched form fields for intake creation.
 * @param control - react-hook-form control object (from useForm)
 */
export function useIntakeFormStates(control: Control) {
  return {
    // Basic fields
    category: useWatch({ control, name: "category" }),
    firstProcedureType: useWatch({ control, name: "firstProcedureType" }),
    clientId: useWatch({ control, name: "clientId" }) ?? "",
    feeType: useWatch({ control, name: "feeType" }),
    ownerUserId: useWatch({ control, name: "ownerUserId" }),
    coUserIds: useWatch({ control, name: "coUserIds" }),
    receivedAt: useWatch({ control, name: "receivedAt" }),
    jurisdiction: useWatch({ control, name: "jurisdiction" }) ?? "",
    firstAgency: useWatch({ control, name: "firstAgency" }),

    // Additional flags
    barFiling: useWatch({ control, name: "barFiling" }),
    counterclaim: useWatch({ control, name: "counterclaim" }),
    ourStanding: useWatch({ control, name: "ourStanding" }),
    businessType: useWatch({ control, name: "businessType" }),
    serviceStart: useWatch({ control, name: "serviceStart" }),
    serviceEnd: useWatch({ control, name: "serviceEnd" }),
    counselType: useWatch({ control, name: "counselType" }),

    // Auto-title fields
    parties: useWatch({ control, name: "parties" }),
    title: useWatch({ control, name: "title" }),
    causeFreeText: useWatch({ control, name: "causeFreeText" }),
    claimAmount: useWatch({ control, name: "claimAmount" }),
    claimDescription: useWatch({ control, name: "claimDescription" }),
    causeId: useWatch({ control, name: "causeId" }),
  };
}
