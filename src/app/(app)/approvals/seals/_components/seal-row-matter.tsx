"use client";

export function SealRowMatter({ matter }: { matter: { id: string; title: string } | null }) {
  return (
    <td className="px-3 py-2 text-muted-foreground">
      {matter ? (
        <a
          href={`/matters/${matter.id}`}
          className="inline-block max-w-[180px] truncate text-[11px] hover:text-primary"
          title={matter.title}
        >
          {matter.title}
        </a>
      ) : (
        <span className="text-[10px]">—</span>
      )}
    </td>
  );
}
