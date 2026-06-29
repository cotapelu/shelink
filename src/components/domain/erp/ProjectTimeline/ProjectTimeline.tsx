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
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Clock, Flag, Calendar, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from '@/components/Dropdown/Dropdown';

export interface TimelineTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies?: string[];
  assignee?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'delayed';
}

export interface Milestone {
  id: string;
  name: string;
  date: string;
  description?: string;
  status?: 'upcoming' | 'completed' | 'at_risk';
}

export interface ProjectTimelineProps {
  tasks: TimelineTask[];
  milestones?: Milestone[];
  startDate?: string;
  endDate?: string;
  onTaskClick?: (task: TimelineTask) => void;
  onMilestoneClick?: (milestone: Milestone) => void;
  showDependencies?: boolean;
  className?: string;
}

const statusColors = {
  pending: 'bg-stone-200 text-stone-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  delayed: 'bg-red-100 text-red-700',
};

const milestoneStatusColors = {
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  at_risk: 'bg-red-100 text-red-700 border-red-200',
};

export function ProjectTimeline({
  tasks,
  milestones = [],
  startDate,
  endDate,
  onTaskClick,
  onMilestoneClick,
  showDependencies = true,
  className,
}: ProjectTimelineProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const calculateDays = (start: string, end: string) => {
    const startD = new Date(start);
    const endD = new Date(end);
    return Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTaskPosition = (task: TimelineTask, projectStart: Date, totalDays: number) => {
    const taskStart = new Date(task.startDate);
    const daysFromStart = Math.ceil((taskStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return {
      left: `${(daysFromStart / totalDays) * 100}%`,
      width: `${(calculateDays(task.startDate, task.endDate) / totalDays) * 100}%`,
    };
  };

  const projectStart = startDate ? new Date(startDate) : new Date(Math.min(...tasks.map(t => new Date(t.startDate).getTime())));
  const projectEnd = endDate ? new Date(endDate) : new Date(Math.max(...tasks.map(t => new Date(t.endDate).getTime())));
  const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) || 30;

  const generateMonthHeaders = (): { label: string; left: string; width: string }[] => {
    const months: { label: string; left: string; width: string }[] = [];
    let current = new Date(projectStart);
    current.setDate(1);
    
    while (current <= projectEnd) {
      const monthStart = new Date(current);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      const effectiveStart = monthStart < projectStart ? projectStart : monthStart;
      const effectiveEnd = monthEnd > projectEnd ? projectEnd : monthEnd;
      
      const daysInMonth = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysInMonth > 0) {
        const daysFromStart = Math.ceil((effectiveStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
        months.push({
          label: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          left: `${(daysFromStart / totalDays) * 100}%`,
          width: `${(daysInMonth / totalDays) * 100}%`,
        });
      }
      
      current = new Date(current.getFullYear(), current.getMonth() + 2, 1);
    }
    return months;
  };

  const months = generateMonthHeaders();

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="min-w-[800px]">
        <div className="bg-stone-50 border border-stone-200 rounded-t-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-stone-800">Project Timeline</h3>
            <div className="flex items-center gap-4 text-xs text-stone-500">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded"></span>
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded"></span>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 bg-red-500 rounded"></span>
                <span>Delayed</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="flex border-b border-stone-200">
              <div className="w-48 shrink-0 px-2 py-2 text-xs font-medium text-stone-500">Task</div>
              <div className="flex-1 relative h-8">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full border-l border-stone-200 first:border-l-0"
                    style={{ left: month.left, width: month.width }}
                  >
                    <span className="text-xs text-stone-500 pl-1">{month.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-48 right-0 h-full">
                <div className="absolute inset-0 flex">
                  {months.map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 border-l border-stone-100"
                    />
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center">
                  {milestones.map((milestone) => {
                    const daysFromStart = Math.ceil((new Date(milestone.date).getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
                    const position = `${(daysFromStart / totalDays) * 100}%`;
                    return (
                      <motion.div
                        key={milestone.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute cursor-pointer"
                        style={{ left: position, transform: 'translateX(-50%)' }}
                        onClick={() => onMilestoneClick?.(milestone)}
                      >
                        <Flag
                          className={cn(
                            'w-5 h-5',
                            milestone.status === 'completed' ? 'text-green-600' :
                            milestone.status === 'at_risk' ? 'text-red-600' : 'text-blue-600'
                          )}
                        />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-stone-100 border-x border-b border-stone-200 rounded-b-xl bg-white">
          {tasks.map((task, index) => {
            const position = getTaskPosition(task, projectStart, totalDays);
            const isExpanded = expandedTasks.has(task.id);

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className="flex items-center hover:bg-stone-50 cursor-pointer"
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="w-48 shrink-0 px-2 py-3 flex items-center gap-2">
                    {task.dependencies && task.dependencies.length > 0 && showDependencies && (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                        className="p-0.5 hover:bg-stone-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        )}
                      </button>
                    )}
                    <span className="text-sm text-stone-700 truncate">{task.name}</span>
                    <Dropdown
                      trigger={
                        <button
                          className="p-1 hover:bg-stone-100 rounded ml-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4 text-stone-400" />
                        </button>
                      }
                    >
                      <DropdownItem onClick={() => onTaskClick?.(task)}>View Details</DropdownItem>
                      <DropdownSeparator />
                      <DropdownLabel>Quick Actions</DropdownLabel>
                      <DropdownItem>Mark Complete</DropdownItem>
                      <DropdownItem>Edit Task</DropdownItem>
                    </Dropdown>
                  </div>
                  <div className="flex-1 relative h-12">
                    <div className="absolute top-1/2 -translate-y-1/2 h-6 flex items-center">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: position.width }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={cn(
                          'h-full rounded-full relative',
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'delayed' ? 'bg-red-500' : 'bg-blue-500'
                        )}
                        style={{ marginLeft: position.left }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-white font-medium">
                            {task.progress}%
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {isExpanded && task.dependencies && task.dependencies.length > 0 && (
                  <div className="bg-stone-50 border-t border-stone-100 px-2 py-2 ml-48">
                    <div className="text-xs text-stone-500 mb-1">Dependencies:</div>
                    <div className="flex flex-wrap gap-1">
                      {task.dependencies.map((depId) => {
                        const depTask = tasks.find(t => t.id === depId);
                        return depTask ? (
                          <Badge key={depId} variant="outline" >
                            {depTask.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.startDate)} - {formatDate(task.endDate)}
                      </span>
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <span className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center">
                            <span className="text-[10px] text-amber-700">
                              {task.assignee.charAt(0)}
                            </span>
                          </span>
                          {task.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {milestones.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-stone-700 mb-2">Milestones</h4>
            <div className="flex flex-wrap gap-2">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  onClick={() => onMilestoneClick?.(milestone)}
                  className={cn(
                    'px-3 py-2 rounded-lg border cursor-pointer hover:shadow-md transition-all',
                    milestoneStatusColors[milestone.status || 'upcoming']
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4" />
                    <span className="text-sm font-medium">{milestone.name}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-75">{formatDate(milestone.date)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
