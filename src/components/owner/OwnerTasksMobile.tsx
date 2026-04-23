import { CheckSquare, Clock, AlertCircle, Filter, Plus, Edit, CalendarClock } from 'lucide-react';
import { Task } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useState } from 'react';
import { TaskFormMobile } from './TaskFormMobile';
import { Button } from '../ui/button';

interface OwnerTasksMobileProps {
  tasks: Task[];
  employees: { id: string; name: string }[];
}

export function OwnerTasksMobile({ tasks, employees }: OwnerTasksMobileProps) {
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const overdueTasks = todoTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const handleSaveTask = (taskData: Partial<Task>) => {
    // В реальном приложении здесь будет API вызов
    console.log('Save task:', taskData);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Срочно';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      default:
        return 'Низкий';
    }
  };

  return (
    <div className="space-y-4 animate-scale-in pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Задачи команды</h1>
          <p className="text-[#133C2A]/60">Управление задачами администраторов</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl text-[#133C2A] mb-1">{todoTasks.length}</p>
            <p className="text-xs text-[#133C2A]/60">К выполнению</p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4 text-center">
            <CheckSquare className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl text-[#133C2A] mb-1">{doneTasks.length}</p>
            <p className="text-xs text-[#133C2A]/60">Выполнено</p>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl text-[#133C2A] mb-1">{overdueTasks.length}</p>
            <p className="text-xs text-[#133C2A]/60">Просрочено</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-smooth ${
            filter === 'all'
              ? 'bg-[#133C2A] text-white'
              : 'bg-white text-[#133C2A]/60 border border-[#133C2A]/10'
          }`}
        >
          Все ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('todo')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-smooth ${
            filter === 'todo'
              ? 'bg-[#133C2A] text-white'
              : 'bg-white text-[#133C2A]/60 border border-[#133C2A]/10'
          }`}
        >
          Активные ({todoTasks.length})
        </button>
        <button
          onClick={() => setFilter('done')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-smooth ${
            filter === 'done'
              ? 'bg-[#133C2A] text-white'
              : 'bg-white text-[#133C2A]/60 border border-[#133C2A]/10'
          }`}
        >
          Выполнено ({doneTasks.length})
        </button>
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-8 text-center">
            <CheckSquare className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-3" />
            <p className="text-[#133C2A]/60 mb-4">Нет задач</p>
            <Button
              onClick={() => setIsFormOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать задачу
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <Card 
              key={task.id} 
              className="border-none soft-shadow cursor-pointer hover:shadow-lg transition-smooth"
              onClick={() => handleEditTask(task)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    task.status === 'done' 
                      ? 'bg-green-50' 
                      : task.dueDate && new Date(task.dueDate) < new Date()
                      ? 'bg-red-50'
                      : 'bg-blue-50'
                  }`}>
                    {task.status === 'done' ? (
                      <CheckSquare className="w-5 h-5 text-green-500" />
                    ) : task.dueDate && new Date(task.dueDate) < new Date() ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`text-[#133C2A] ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                        {task.title}
                      </h3>
                      <Badge className={`flex-shrink-0 text-xs ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-sm text-[#133C2A]/60 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-[#133C2A]/60">
                      <span>{task.assigneeName}</span>
                      {task.scheduledDate && new Date(task.scheduledDate) > new Date() && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[#D4AF37]">
                            <CalendarClock className="w-3 h-3" />
                            С {formatDate(task.scheduledDate)}
                          </span>
                        </>
                      )}
                      {task.dueDate && (
                        <>
                          <span>•</span>
                          <span className={
                            task.status !== 'done' && new Date(task.dueDate) < new Date()
                              ? 'text-red-500'
                              : ''
                          }>
                            До {formatDate(task.dueDate)}
                          </span>
                        </>
                      )}
                      {task.category && (
                        <>
                          <span>•</span>
                          <span>{task.category}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <Edit className="w-4 h-4 text-[#133C2A]/40 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Add Button */}
      {filteredTasks.length > 0 && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white shadow-xl flex items-center justify-center hover:scale-110 transition-smooth z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Task Form */}
      <TaskFormMobile
        isOpen={isFormOpen}
        task={editingTask}
        employees={employees}
        onSave={handleSaveTask}
        onClose={handleCloseForm}
      />
    </div>
  );
}