/*
 * Hàm thuần cho getMatterInvoiceContext — tách khỏi action để test
 * (R-refactor AUTO-60). Không import Prisma/DB.
 */

/** Khách chính của vụ (hình dạng tối thiản). */
export type PrimaryClientRow = {
  id: string;
  name: string;
  idNumber: string | null;
} | null;

/** Một liên kết khách–vụ (client có thể null khi dữ liệu hỏng). */
export type ClientLinkRow = {
  isPrimary: boolean;
  client: { id: string; name: string; idNumber: string | null } | null;
};

export type ClientOption = {
  id: string;
  name: string;
  taxNo: string | null;
  isPrimary: boolean;
};

/** Context trả về cho màn xuất hóa đơn. */
export type InvoiceContext = {
  matterId: string;
  matterTitle: string;
  intakeId: string | null;
  intake: {
    id: string;
    status: string;
    receivedAt: Date | null;
    clientName: string | null;
  } | null;
  clientOptions: ClientOption[];
  defaultBuyerName: string | null;
};

/** Dòng matter từ query (hình dạng tối thiểu cho context). */
export type MatterInvoiceRow = {
  id: string;
  title: string;
  intakeId: string | null;
  intake: {
    id: string;
    status: string;
    receivedAt: Date | null;
    client: { name: string } | null;
  } | null;
  primaryClient: { id: string; name: string; idNumber: string | null } | null;
  clientLinks: ClientLinkRow[];
};

/** Map 1 khách thành option (taxNo = idNumber). */
function toClientOption(
  client: { id: string; name: string; idNumber: string | null },
  isPrimary: boolean
): ClientOption {
  return { id: client.id, name: client.name, taxNo: client.idNumber ?? null, isPrimary };
}

/** Gộp khách chính + khách liên kết (loại trùng, khách chính/primary lên đầu). */
export function buildClientOptions(primaryClient: PrimaryClientRow, links: ClientLinkRow[]): ClientOption[] {
  const clientMap = new Map<string, ClientOption>();
  if (primaryClient) clientMap.set(primaryClient.id, toClientOption(primaryClient, true));
  for (const link of links) {
    if (!link.client) continue;
    const existing = clientMap.get(link.client.id);
    if (existing) existing.isPrimary = existing.isPrimary || link.isPrimary;
    else clientMap.set(link.client.id, toClientOption(link.client, link.isPrimary));
  }
  return Array.from(clientMap.values()).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/** Dựng context xuất hóa đơn từ dòng matter + danh sách option (đã tính trước). */
export function buildInvoiceContext(m: MatterInvoiceRow, clientOptions: ClientOption[]): InvoiceContext {
  return {
    matterId: m.id,
    matterTitle: m.title,
    intakeId: m.intakeId ?? null,
    intake: m.intake
      ? {
          id: m.intake.id,
          status: m.intake.status,
          receivedAt: m.intake.receivedAt,
          clientName: m.intake.client?.name ?? null
        }
      : null,
    clientOptions,
    defaultBuyerName: m.primaryClient?.name ?? m.intake?.client?.name ?? null
  };
}
