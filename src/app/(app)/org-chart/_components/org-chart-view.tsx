"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Network } from "lucide-react";
import { ROLE_LABELS_VI, type OrgChart as OrgChartData, type OrgMember, type OrgTeam } from "@/server/teams/org-chart";

type Props = {
  chart: OrgChartData;
};

/** Lấy chữ cái đầu để hiển thị avatar fallback. */
function initialsOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return [...trimmed][0].toUpperCase();
}

function MemberChip({ member }: { member: OrgMember }) {
  return (
    <li className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <Avatar className="h-7 w-7 border border-border bg-primary/10">
        {member.avatar ? <AvatarImage src={member.avatar} alt={member.name} /> : null}
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initialsOf(member.name)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={member.name}>
        {member.name}
      </span>
      <Badge variant="secondary" className="shrink-0 text-[11px]">
        {ROLE_LABELS_VI[member.role]}
      </Badge>
    </li>
  );
}

function TeamCard({ team }: { team: OrgTeam }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{team.name}</CardTitle>
          <Badge variant="outline" className="shrink-0 tabular-nums">
            {team.memberCount}
          </Badge>
        </div>
        {team.description ? <CardDescription>{team.description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {team.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có thành viên</p>
        ) : (
          <ul className="space-y-1.5">
            {team.members.map((member) => (
              <MemberChip key={member.userId} member={member} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function OrgChartView({ chart }: Props) {
  if (chart.totalTeams === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Network className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Chưa có nhóm nào</p>
          <p className="text-sm text-muted-foreground">
            Tạo team ở khu vực ERP để cơ cấu tổ chức hiển thị tại đây.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sơ đồ tổ chức</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {chart.totalTeams} nhóm · {chart.totalMembers} thành viên
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {chart.teams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
