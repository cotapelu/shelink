/**
 * Sơ đồ tổ chức — thuần, không DB/React (TD-D4; docs/UI-DESIGN §7.12).
 * Nguồn: Team + TeamMember sẵn có trong schema — không thêm model/migration.
 */

/** Vai trò trong nhóm (khớp enum TeamRole của Prisma). */
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

/** Thứ tự hiển thị vai trò: cấp cao lên trước. */
export const ROLE_ORDER: Record<OrgRole, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2, GUEST: 3 };

/** Nhãn tiếng Việt cho vai trò nhóm. */
export const ROLE_LABELS_VI: Record<OrgRole, string> = {
  OWNER: "Trưởng nhóm",
  ADMIN: "Phó nhóm",
  MEMBER: "Thành viên",
  GUEST: "Khách"
};

export type OrgMember = {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  role: OrgRole;
};

export type OrgTeam = {
  id: string;
  name: string;
  description: string | null;
  members: OrgMember[];
  memberCount: number;
};

export type OrgChart = {
  teams: OrgTeam[];
  totalTeams: number;
  totalMembers: number;
};

/** Dòng TeamMember từ Prisma (join User) — chỉ khai báo phần cần dùng. */
export type OrgMemberRow = {
  role: string;
  user: { id: string; name: string | null; email?: string | null; avatar?: string | null };
};

/** Dòng Team từ Prisma. */
export type OrgTeamInput = {
  id: string;
  name: string;
  description?: string | null;
  members?: OrgMemberRow[] | null;
};

/** Vai trò lạ/thiếu → MEMBER (dữ liệu cũ hoặc enum mở rộng không vỡ UI). */
export function normalizeOrgRole(role: unknown): OrgRole {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER" || role === "GUEST" ? role : "MEMBER";
}

/** Map 1 dòng thành viên; trả null nếu thiếu user hợp lệ (dữ liệu hỏng). */
function mapMember(row: OrgMemberRow): OrgMember | null {
  const user = row?.user;
  if (!user?.id) return null;
  return {
    userId: user.id,
    name: user.name?.trim() || user.email || "Không tên",
    email: user.email ?? null,
    avatar: user.avatar ?? null,
    role: normalizeOrgRole(row.role)
  };
}

/** Khử trùng theo userId trong 1 team, giữ vai trò mạnh nhất. */
function dedupeMembers(members: OrgMember[]): OrgMember[] {
  const byUserId = new Map<string, OrgMember>();
  for (const m of members) {
    const current = byUserId.get(m.userId);
    if (!current || ROLE_ORDER[m.role] < ROLE_ORDER[current.role]) byUserId.set(m.userId, m);
  }
  return [...byUserId.values()];
}

/** Sắp xếp thành viên: cấp vai trò trước → tên A→Z (không mutate đầu vào). */
export function sortOrgMembers(members: OrgMember[]): OrgMember[] {
  return [...members].sort(
    (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name)
  );
}

/** Map 1 team: thành viên khử trùng + sắp xếp, đếm số lượng. */
function mapTeamRow(t: OrgTeamInput): OrgTeam {
  const rows = t.members ?? [];
  const members = sortOrgMembers(
    dedupeMembers(rows.map(mapMember).filter((m): m is OrgMember => m !== null))
  );
  return { id: t.id, name: t.name, description: t.description ?? null, members, memberCount: members.length };
}

/** Dựng cơ cấu: team theo tên A→Z; thành viên theo vai trò rồi tên; bỏ dữ liệu hỏng. */
export function buildOrgChart(teams: OrgTeamInput[]): OrgChart {
  const mapped = teams
    .filter((t) => !!t?.id && !!t.name)
    .map(mapTeamRow)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    teams: mapped,
    totalTeams: mapped.length,
    totalMembers: mapped.reduce((sum, t) => sum + t.memberCount, 0)
  };
}
