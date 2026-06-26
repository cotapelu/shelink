export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  creatorId: string;
  assigneeId?: string;
  dueDate?: string | Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}