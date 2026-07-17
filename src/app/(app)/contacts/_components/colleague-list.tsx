"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { userRoleLabel } from "@/lib/enums";

type ColleagueItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar: string | null;
};

interface ColleagueListProps {
  colleagues: ColleagueItem[];
}

export function ColleagueList({ colleagues }: ColleagueListProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {colleagues.map((u) => (
        <div key={u.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
          <Avatar className="h-10 w-10 border border-border bg-primary/10">
            {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {u.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{u.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {userRoleLabel[u.role as keyof typeof userRoleLabel] ?? u.role}
            </div>
            <div className="mt-1 space-y-0.5 text-[11px] text-foreground/80">
              <div className="truncate font-mono">{u.email}</div>
              {u.phone && <div className="font-mono">{u.phone}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
