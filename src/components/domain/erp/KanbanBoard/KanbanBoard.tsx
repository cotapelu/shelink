/*
 * Copyright 2026 叶森 (Sen Ye) - Original work
 * Copyright 2026 COTAPELU - Modifications and additions
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file is part of a derivative work based on the original MIT-licensed project.
 * Original author: 叶森 (Sen Ye) - Copyright 2026
 */
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/Dropdown/Dropdown';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  assignee?: {
    name: string;
    avatar?: string;
  };
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  color?: string;
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
  onCardClick?: (card: KanbanCard) => void;
  onColumnAdd?: (title: string) => void;
  onColumnDelete?: (columnId: string) => void;
  onColumnUpdate?: (columnId: string, title: string) => void;
  onCardAdd?: (columnId: string, card: Partial<KanbanCard>) => void;
  onCardDelete?: (cardId: string) => void;
  className?: string;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

export function KanbanBoard({
  columns,
  onCardMove,
  onCardClick,
  onColumnAdd,
  onColumnDelete,
  onColumnUpdate,
  onCardAdd,
  onCardDelete,
  className,
}: KanbanBoardProps) {
  const [localColumns, setLocalColumns] = useState(columns);
  const [draggedCard, setDraggedCard] = useState<{ card: KanbanCard; columnId: string } | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddCard, setShowAddCard] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleDragStart = (e: React.DragEvent, card: KanbanCard, columnId: string) => {
    setDraggedCard({ card, columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    if (!draggedCard) return;

    const { card, columnId: fromColumnId } = draggedCard;

    if (fromColumnId !== toColumnId) {
      const newColumns = localColumns.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== card.id) };
        }
        if (col.id === toColumnId) {
          return { ...col, cards: [...col.cards, card] };
        }
        return col;
      });
      setLocalColumns(newColumns);
      onCardMove?.(card.id, fromColumnId, toColumnId, 0);
    }

    setDraggedCard(null);
    setDraggedOverColumn(null);
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      onColumnAdd?.(newColumnTitle.trim());
      setNewColumnTitle('');
      setShowAddColumn(false);
    }
  };

  const handleAddCard = (columnId: string) => {
    if (newCardTitle.trim()) {
      onCardAdd?.(columnId, { title: newCardTitle.trim() });
      setNewCardTitle('');
      setShowAddCard(null);
    }
  };

  const deleteColumn = (columnId: string) => {
    onColumnDelete?.(columnId);
  };

  const deleteCard = (cardId: string) => {
    onCardDelete?.(cardId);
  };

  return (
    <div className={cn('overflow-x-auto pb-4', className)}>
      <div className="flex gap-4 min-h-[500px]">
        {localColumns.map((column) => (
          <div
            key={column.id}
            className={cn(
              'flex-shrink-0 w-80 bg-stone-100 rounded-xl p-3 transition-colors',
              draggedOverColumn === column.id && 'bg-stone-200 ring-2 ring-amber-400'
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                {column.color && (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
                )}
                <h3 className="font-semibold text-stone-800">{column.title}</h3>
                <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full">
                  {column.cards.length}
                </span>
              </div>
              <Dropdown
                trigger={
                  <button className="p-1 hover:bg-stone-200 rounded-lg transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-stone-500" />
                  </button>
                }
              >
                <DropdownItem
                  onClick={() => {
                    const newTitle = prompt('Enter new column title:', column.title);
                    if (newTitle && newTitle !== column.title) {
                      onColumnUpdate?.(column.id, newTitle);
                    }
                  }}
                >
                  Rename
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem destructive onClick={() => deleteColumn(column.id)}>
                  Delete Column
                </DropdownItem>
              </Dropdown>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              <AnimatePresence>
                {column.cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.05 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, card, column.id)}
                    onClick={() => onCardClick?.(card)}
                    className={cn(
                      'bg-white rounded-lg p-3 shadow-sm border border-stone-200 cursor-pointer hover:shadow-md transition-all',
                      draggedCard?.card.id === card.id && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 text-stone-400 cursor-grab">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-stone-800 text-sm">{card.title}</h4>
                        {card.description && (
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">{card.description}</p>
                        )}
                      </div>
                      <Dropdown
                        trigger={
                          <button
                            className="p-1 hover:bg-stone-100 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-3 h-3 text-stone-400" />
                          </button>
                        }
                      >
                        <DropdownItem
                          onClick={() => {
                            onCardClick?.(card);
                          }}
                        >
                          Edit
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          destructive
                          onClick={() => {
                            deleteCard(card.id);
                          }}
                        >
                          Delete
                        </DropdownItem>
                      </Dropdown>
                    </div>

                    {card.tags && card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {card.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      {card.priority && (
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs rounded-full border',
                            priorityColors[card.priority]
                          )}
                        >
                          {card.priority}
                        </span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {card.assignee && (
                          <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center">
                            <span className="text-xs font-medium text-amber-700">
                              {card.assignee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {card.dueDate && (
                          <span className="text-xs text-stone-500">{card.dueDate}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {showAddCard === column.id ? (
                <div className="bg-white rounded-lg p-3 border border-stone-200">
                  <Input
                    placeholder="Enter card title"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCard(column.id);
                      if (e.key === 'Escape') setShowAddCard(null);
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleAddCard(column.id)}>
                      Add
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddCard(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddCard(column.id)}
                  className="w-full p-2 flex items-center justify-center gap-1 text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Card
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex-shrink-0 w-80">
          {showAddColumn ? (
            <div className="bg-stone-100 rounded-xl p-3">
              <Input
                placeholder="Enter column title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') setShowAddColumn(false);
                }}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleAddColumn}>
                  Add Column
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddColumn(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddColumn(true)}
              className="w-full p-3 flex items-center justify-center gap-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
