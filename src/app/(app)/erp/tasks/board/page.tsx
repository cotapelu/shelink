"use client";

import { KanbanBoard, type KanbanColumn } from "@/components/domain/erp/KanbanBoard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function TasksBoardPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([
    {
      id: "todo",
      title: "Chưa làm",
      color: "bg-stone-200",
      cards: [
        { id: "t1", title: "Viết báo cáo", description: "Báo cáo quý", priority: "high" },
        { id: "t2", title: "Gặp khách hàng", description: "Thảo luận hợp đồng", priority: "medium" },
      ],
    },
    {
      id: "in-progress",
      title: "Đang thực hiện",
      color: "bg-blue-200",
      cards: [
        { id: "t3", title: "Phát triển tính năng X", description: "Backend API", priority: "high" },
      ],
    },
    {
      id: "review",
      title: "Đánh giá",
      color: "bg-amber-200",
      cards: [],
    },
    {
      id: "done",
      title: "Hoàn thành",
      color: "bg-green-200",
      cards: [
        { id: "t4", title: "Thiết kế UI", description: "Wireframe", priority: "low" },
      ],
    },
  ]);

  const handleCardMove = (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => {
    setColumns((prev) => {
      const newCols = prev.map((col) => ({ ...col }));
      const fromCol = newCols.find((c) => c.id === fromColumnId)!;
      const toCol = newCols.find((c) => c.id === toColumnId)!;
      const cardIndex = fromCol.cards.findIndex((c) => c.id === cardId);
      const [card] = fromCol.cards.splice(cardIndex, 1);
      toCol.cards.splice(newIndex, 0, card);
      return newCols;
    });
  };

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full h-screen">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-stone-800 tracking-tight">
              Bảng Kanban
            </h2>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Kéo và thả để thay đổi trạng thái công việc.
            </p>
          </div>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 h-4 w-4" />
            Thêm cột
          </Button>
        </div>

        {/* Kanban Board */}
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-4 sm:p-6" style={{ height: "calc(100vh - 200px)" }}>
          <KanbanBoard columns={columns} onCardMove={handleCardMove} />
        </div>
      </div>
    </main>
  );
}
