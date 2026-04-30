import { useState } from 'react';
import { Task, User, Child } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { CheckCircle2, Circle, Calendar, User as UserIcon, Plus, Edit, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface TasksManagementProps {
  tasks: Task[];
  employees: User[]; // Список сотрудников (администраторы, преподаватели)
  clients: User[]; // Список клиентов (родителей)
  children: Child[]; // Список детей
  currentUser: User;
}

export function TasksManagement({ tasks, employees, clients, children, currentUser }: TasksManagementProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    assigneeId: '',
    relatedUserId: '',
    relatedChildId: '',
    status: 'todo' as 'todo' | 'done',
  });

  // Фильтрация задач
  const filteredTasks = tasks.filter(task => {
    // Фильтр по статусу
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;

    // Фильтр по исполнителю
    if (assigneeFilter === 'me' && task.assigneeId !== currentUser.id) return false;
    if (assigneeFilter !== 'all' && assigneeFilter !== 'me' && task.assigneeId !== assigneeFilter) return false;

    return true;
  });

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const doneTasks = tasks.filter(t => t.status === 'done');

  const handleOpenCreateDialog = () => {
    setTaskForm({
      title: '',
      description: '',
      dueDate: '',
      assigneeId: '',
      relatedUserId: '',
      relatedChildId: '',
      status: 'todo',
    });
    setCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assigneeId: task.assigneeId,
      relatedUserId: task.relatedUserId || '',
      relatedChildId: task.relatedChildId || '',
      status: task.status,
    });
    setEditDialogOpen(true);
  };

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Введите название задачи');
      return;
    }
    if (!taskForm.assigneeId) {
      toast.error('Выберите исполнителя');
      return;
    }

    toast.success(`Задача "${taskForm.title}" создана!`);
    setCreateDialogOpen(false);
  };

  const handleUpdateTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Введите название задачи');
      return;
    }

    toast.success(`Задача "${taskForm.title}" обновлена!`);
    setEditDialogOpen(false);
  };

  const handleDeleteTask = (task: Task) => {
    if (confirm(`Удалить задачу "${task.title}"?`)) {
      toast.success(`Задача "${task.title}" удалена`);
    }
  };

  const handleToggleStatus = (task: Task) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    toast.success(`Задача отмечена как ${newStatus === 'done' ? 'выполненная' : 'к выполнению'}`);
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'done') return false;
    return new Date(task.dueDate) < new Date();
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">Задачи</h1>
          <p className="text-[#133C2A]/60">Управление задачами команды</p>
        </div>

        <Button 
          onClick={handleOpenCreateDialog}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
        >
          <Plus className="w-5 h-5" />
          Создать задачу
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Статус</Label>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-xl flex-1 ${
                    statusFilter === 'all'
                      ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                      : 'border-[#133C2A]/20 hover:bg-[#133C2A]/5 text-[#133C2A]'
                  }`}
                >
                  Все ({tasks.length})
                </Button>
                <Button
                  variant={statusFilter === 'todo' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('todo')}
                  className={`rounded-xl flex-1 ${
                    statusFilter === 'todo'
                      ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                      : 'border-[#133C2A]/20 hover:bg-[#133C2A]/5 text-[#133C2A]'
                  }`}
                >
                  К выполнению ({todoTasks.length})
                </Button>
                <Button
                  variant={statusFilter === 'done' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('done')}
                  className={`rounded-xl flex-1 ${
                    statusFilter === 'done'
                      ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                      : 'border-[#133C2A]/20 hover:bg-[#133C2A]/5 text-[#133C2A]'
                  }`}
                >
                  Выполненные ({doneTasks.length})
                </Button>
              </div>
            </div>

            {/* Assignee Filter */}
            <div className="space-y-2">
              <Label className="text-[#133C2A]">Исполнитель</Label>
              <div className="relative">
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="all">Любой исполнитель</option>
                  <option value="me">Назначенные мне</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card className="border-none soft-shadow">
            <CardContent className="py-12 text-center">
              <Circle className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-[#133C2A] mb-2">Нет задач</h3>
              <p className="text-[#133C2A]/60">
                {statusFilter === 'done' 
                  ? 'Пока нет выполненных задач'
                  : 'Создайте первую задачу'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const overdue = isOverdue(task);
            
            return (
              <Card 
                key={task.id} 
                className={`border-none soft-shadow hover:shadow-lg transition-smooth ${
                  overdue ? 'ring-2 ring-red-200' : ''
                } ${task.status === 'done' ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={() => handleToggleStatus(task)}
                        className="w-5 h-5 rounded border-[#133C2A]/20 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                      />
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className={`text-[#133C2A] mb-1 ${task.status === 'done' ? 'line-through' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-[#133C2A]/60 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Task Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-[#133C2A]/60">
                        {/* Assignee */}
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          <span>{task.assigneeName}</span>
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                          <div className={`flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}>
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        )}

                        {/* Related Client */}
                        {task.relatedUserName && (
                          <Badge 
                            className="bg-blue-50 text-blue-600 border-blue-200 text-xs cursor-pointer hover:bg-blue-100"
                          >
                            Клиент: {task.relatedUserName}
                          </Badge>
                        )}

                        {/* Related Child */}
                        {task.relatedChildName && (
                          <Badge 
                            className="bg-purple-50 text-purple-600 border-purple-200 text-xs cursor-pointer hover:bg-purple-100"
                          >
                            Ребенок: {task.relatedChildName}
                          </Badge>
                        )}

                        {/* Auto-generated */}
                        {task.isAutoGenerated && (
                          <Badge className="bg-orange-50 text-orange-600 border-orange-200 text-xs">
                            Авто
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditDialog(task)}
                        className="w-8 h-8 p-0 rounded-xl hover:bg-[#D4AF37]/10"
                      >
                        <Edit className="w-4 h-4 text-[#D4AF37]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task)}
                        className="w-8 h-8 p-0 rounded-xl hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Создать задачу</DialogTitle>
            <DialogDescription>
              Создайте новую задачу и назначьте исполнителя
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-[#133C2A]">
                Название <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Например: Связаться с родителями Анны"
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[#133C2A]">
                Описание
              </Label>
              <textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Подробности задачи..."
                className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="text-[#133C2A]">
                  Срок выполнения
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="assignee" className="text-[#133C2A]">
                  Исполнитель <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <select
                    id="assignee"
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                    className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Выберите...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Related User */}
            <div className="space-y-2">
              <Label htmlFor="relatedUser" className="text-[#133C2A]">
                Связать с клиентом
              </Label>
              <div className="relative">
                <select
                  id="relatedUser"
                  value={taskForm.relatedUserId}
                  onChange={(e) => setTaskForm({ ...taskForm, relatedUserId: e.target.value })}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Не связано</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            {/* Related Child */}
            <div className="space-y-2">
              <Label htmlFor="relatedChild" className="text-[#133C2A]">
                Связать с ребенком
              </Label>
              <div className="relative">
                <select
                  id="relatedChild"
                  value={taskForm.relatedChildId}
                  onChange={(e) => setTaskForm({ ...taskForm, relatedChildId: e.target.value })}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Не связано</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateTask}
              className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl"
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Редактировать задачу</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-[#133C2A]">
                Название <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-[#133C2A]">
                Описание
              </Label>
              <textarea
                id="edit-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="w-full min-h-[100px] px-3 py-2 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate" className="text-[#133C2A]">
                  Срок выполнения
                </Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="rounded-xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="edit-assignee" className="text-[#133C2A]">
                  Исполнитель
                </Label>
                <div className="relative">
                  <select
                    id="edit-assignee"
                    value={taskForm.assigneeId}
                    onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                    className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                  >
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status" className="text-[#133C2A]">
                Статус
              </Label>
              <div className="relative">
                <select
                  id="edit-status"
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as 'todo' | 'done' })}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="todo">К выполнению</option>
                  <option value="done">Выполнено</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            {/* Related User */}
            <div className="space-y-2">
              <Label htmlFor="edit-relatedUser" className="text-[#133C2A]">
                Связать с клиентом
              </Label>
              <div className="relative">
                <select
                  id="edit-relatedUser"
                  value={taskForm.relatedUserId}
                  onChange={(e) => setTaskForm({ ...taskForm, relatedUserId: e.target.value })}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Не связано</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>

            {/* Related Child */}
            <div className="space-y-2">
              <Label htmlFor="edit-relatedChild" className="text-[#133C2A]">
                Связать с ребенком
              </Label>
              <div className="relative">
                <select
                  id="edit-relatedChild"
                  value={taskForm.relatedChildId}
                  onChange={(e) => setTaskForm({ ...taskForm, relatedChildId: e.target.value })}
                  className="w-full h-10 px-3 pr-10 rounded-xl border border-[#133C2A]/20 bg-white text-[#133C2A] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none appearance-none cursor-pointer"
                >
                  <option value="">Не связано</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/50 pointer-events-none" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateTask}
              className="bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white hover:opacity-90 rounded-xl"
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
