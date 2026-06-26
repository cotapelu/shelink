'use client';

import { motion } from 'framer-motion';
import { Calendar, MoreHorizontal, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from '@/components/Dropdown/Dropdown';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

export interface TaskCardProps {
  id: string;
  title: string;
  description?: string;
  assignee?: {
    name: string;
    avatar?: string;
    email?: string;
  };
  dueDate?: string;
  startDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  tags?: string[];
  progress?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
  className?: string;
}

const priorityConfig: Record<TaskPriority, { label: string; variant: 'green' | 'orange' | 'red' | 'blue' | 'default' }> = {
  low: { label: 'Low', variant: 'blue' },
  medium: { label: 'Medium', variant: 'orange' },
  high: { label: 'High', variant: 'red' },
  urgent: { label: 'Urgent', variant: 'red' },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: 'bg-stone-200 text-stone-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  review: { label: 'Review', color: 'bg-purple-100 text-purple-700' },
  done: { label: 'Done', color: 'bg-green-100 text-green-700' },
  blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700' },
};

export function TaskCard({
  id,
  title,
  description,
  assignee,
  dueDate,
  startDate,
  priority = 'medium',
  status = 'todo',
  tags = [],
  progress,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  className,
}: TaskCardProps) {
  const priorityInfo = priorityConfig[priority];
  const statusInfo = statusConfig[status];
  // Debug
  if (typeof window !== 'undefined') {
    console.log('TaskCard render: priority', priority, 'priorityInfo', priorityInfo);
    console.log('Badge component exists:', !!Badge);
  }
  // Debug
  if (typeof window !== 'undefined') {
    console.log('TaskCard render: priority', priority, 'priorityInfo', priorityInfo);
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'done';

  // Debug: log expected test ID
  if (typeof window !== 'undefined' && priority) {
    console.log('Expected badge testid:', `badge-${priorityInfo.variant}-sm`);
  }

  return (
    <motion.div
      data-testid="task-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'bg-white rounded-xl border border-stone-200 p-4 cursor-pointer hover:shadow-lg transition-all',
        isOverdue && 'border-red-300 bg-red-50/50',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {status && (
              <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', statusInfo.color)}>
                {statusInfo.label}
              </span>
            )}
            {priority && (
              <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>
            )}
          </div>
          <h3 className="font-semibold text-stone-800 text-sm mb-1 truncate">{title}</h3>
          {description && (
            <p className="text-xs text-stone-500 line-clamp-2 mb-2">{description}</p>
          )}
        </div>
        <Dropdown
          trigger={
            <button
              className="p-1 hover:bg-stone-100 rounded-lg transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4 text-stone-400" />
            </button>
          }
        >
          {onEdit && (
            <DropdownItem onClick={() => { onEdit?.(); }}>
              Edit
            </DropdownItem>
          )}
          <DropdownSeparator />
          <DropdownLabel>Change Status</DropdownLabel>
          {Object.entries(statusConfig).map(([key, { label }]) => (
            <DropdownItem
              key={key}
              onClick={() => { onStatusChange?.(key as TaskStatus); }}
            >
              {label}
            </DropdownItem>
          ))}
          <DropdownSeparator />
          {onDelete && (
            <DropdownItem destructive onClick={() => { onDelete?.(); }}>
              Delete
            </DropdownItem>
          )}
        </Dropdown>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {progress !== undefined && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-500' : 'bg-blue-500'
              )}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
        <div className="flex items-center gap-3">
          {assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-8 w-8">
                {assignee.avatar && <AvatarImage src={assignee.avatar} />}
                <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-stone-600 truncate max-w-[80px]">{assignee.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-stone-400">
              <User className="w-3.5 h-3.5" />
              <span className="text-xs">Unassigned</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(startDate || dueDate) && (
            <div
              className={cn(
                'flex items-center gap-1',
                isOverdue ? 'text-red-600' : 'text-stone-500'
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              {startDate && !dueDate && <span>{formatDate(startDate)}</span>}
              {dueDate && (
                <span className={cn(isOverdue && 'font-medium')}>
                  {formatDate(dueDate)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
