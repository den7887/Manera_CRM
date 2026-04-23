import { useState, useEffect } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Circle,
  Filter,
  Calendar,
  User,
  CreditCard,
  GraduationCap,
  CalendarDays,
  MessageSquare,
  FileText,
  Settings,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { toast } from 'sonner@2.0.3';

interface AdminTasksProps {
  tasks: Task[];
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Низкий', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  medium: { label: 'Средний', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
  high: { label: 'Высокий', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
  urgent: { label: 'Срочно', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' },
};

const statusConfig: Record<TaskStatus, { label: string; icon: any; color: string }> = {
  pending: { label: 'Ожидает', icon: Circle, color: 'text-gray-500' },
  'in-progress': { label: 'В работе', icon: Clock, color: 'text-blue-500' },
  completed: { label: 'Выполнено', icon: CheckCircle2, color: 'text-green-500' },
  cancelled: { label: 'Отменено', icon: X, color: 'text-red-500' },
};

const typeIcons: Record<string, any> = {
  payment: CreditCard,
  student: GraduationCap,
  schedule: CalendarDays,
  communication: MessageSquare,
  general: FileText,
  system: Settings,
};

export function AdminTasks({ tasks }: AdminTasksProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Фильтрация отложенных задач - показываем только те, которые уже доступны
  const availableTasks = tasks.filter(task => {
    if (!task.startDate) return true; // Задача без startDate всегда видима
    return new Date(task.startDate) <= new Date(); // Показываем только если дата начала наступила
  });

  const filteredTasks = availableTasks.filter(task => {
    if (filter === 'active') {
      return task.status === 'pending' || task.status === 'in-progress';
    }
    if (filter === 'completed') {
      return task.status === 'completed';
    }
    return true;
  });

  const activeTasks = availableTasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
  const completedTasks = availableTasks.filter(t => t.status === 'completed');

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setDetailsOpen(true);
  };

  const handleCompleteTask = (task: Task) => {
    toast.success(`Задача "${task.title}" отмечена как выполненная!`);
    setDetailsOpen(false);
  };

  const handleStartTask = (task: Task) => {
    toast.success(`Задача "${task.title}" взята в работу!`);
    setDetailsOpen(false);
  };

  // Обработчик быстрого выполнения задачи на мобильных
  const handleQuickComplete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Предотвращаем открытие диалога
    
    if (task.status === 'completed') return;
    
    if (task.status === 'pending') {
      toast.success(`Задача "${task.title}" взята в работу и отмечена как выполненная!`);
    } else {
      toast.success(`Задача "${task.title}" отмечена как выполненная!`);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[#133C2A] mb-2">Задачи</h1>
          <p className="text-[#133C2A]/60">Просмотр и выполнение назначенных задач</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className={`rounded-xl ${
              filter === 'all'
                ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                : 'border-[#133C2A]/20 hover:bg-[#133C2A]/5'
            }`}
          >
            Все ({tasks.length})
          </Button>
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            className={`rounded-xl ${
              filter === 'active'
                ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                : 'border-[#133C2A]/20 hover:bg-[#133C2A]/5'
            }`}
          >
            Активные ({activeTasks.length})
          </Button>
          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            className={`rounded-xl ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white'
                : 'border-[#133C2A]/20 hover:bg-[#133C2A]/5'
            }`}
          >
            Выполнено ({completedTasks.length})
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего задач</p>
                <p className="text-2xl text-[#133C2A] mt-1">{tasks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#F8F4E3] flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#D4AF37]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Активные</p>
                <p className="text-2xl text-[#133C2A] mt-1">{activeTasks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Выполнено</p>
                <p className="text-2xl text-[#133C2A] mt-1">{completedTasks.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60">Просрочено</p>
                <p className="text-2xl text-[#133C2A] mt-1">
                  {tasks.filter(t => isOverdue(t)).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card className="border-none soft-shadow">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
              <h3 className="text-[#133C2A] mb-2">Нет задач</h3>
              <p className="text-[#133C2A]/60">
                {filter === 'completed' 
                  ? 'Пока нет выполненных задач'
                  : 'Все задачи выполнены! Отличная работа!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const StatusIcon = statusConfig[task.status]?.icon || Circle;
            const TypeIcon = typeIcons[task.type] || FileText;
            const overdue = isOverdue(task);

            return (
              <Card 
                key={task.id} 
                className={`border-none soft-shadow hover:shadow-lg transition-smooth cursor-pointer ${
                  overdue ? 'ring-2 ring-red-200' : ''
                }`}
                onClick={() => handleViewDetails(task)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div 
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        task.status === 'completed' ? 'bg-green-50' :
                        task.status === 'in-progress' ? 'bg-blue-50' :
                        'bg-gray-50'
                      } ${
                        isMobile && task.status !== 'completed' 
                          ? 'cursor-pointer active:scale-95 ring-2 ring-blue-400/50 hover:ring-blue-500' 
                          : ''
                      }`}
                      onClick={isMobile ? (e) => handleQuickComplete(e, task) : undefined}
                    >
                      <StatusIcon className={`w-5 h-5 ${statusConfig[task.status]?.color || 'text-gray-500'}`} />
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#133C2A]">{task.title}</h3>
                            {task.isAutoGenerated && (
                              <Badge className="bg-purple-50 text-purple-600 border-purple-200 text-xs">
                                Авто
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#133C2A]/60 line-clamp-2">{task.description}</p>
                        </div>

                        {/* Priority Badge */}
                        <Badge className={`${priorityConfig[task.priority]?.bgColor || 'bg-gray-50 border-gray-200'} ${priorityConfig[task.priority]?.color || 'text-gray-600'} border whitespace-nowrap`}>
                          {priorityConfig[task.priority]?.label || 'Не указан'}
                        </Badge>
                      </div>

                      {/* Task Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-[#133C2A]/60">
                        <div className="flex items-center gap-1">
                          <TypeIcon className="w-4 h-4" />
                          <span className="capitalize">{task.type}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{task.assignedByName}</span>
                        </div>

                        {task.dueDate && (
                          <div className={`flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}>
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(task.dueDate)}</span>
                            {overdue && <AlertCircle className="w-4 h-4" />}
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(task.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-[#133C2A] text-xl mb-2">
                    {selectedTask.title}
                  </DialogTitle>
                  <div className="flex gap-2">
                    <Badge className={`${priorityConfig[selectedTask.priority]?.bgColor || 'bg-gray-50 border-gray-200'} ${priorityConfig[selectedTask.priority]?.color || 'text-gray-600'} border`}>
                      {priorityConfig[selectedTask.priority]?.label || 'Не указан'}
                    </Badge>
                    <Badge className="bg-[#F8F4E3] text-[#133C2A] border-[#133C2A]/20">
                      {statusConfig[selectedTask.status]?.label || 'Не указан'}
                    </Badge>
                    {selectedTask.isAutoGenerated && (
                      <Badge className="bg-purple-50 text-purple-600 border-purple-200">
                        Автоматическая
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Description */}
              <div>
                <h4 className="text-sm text-[#133C2A] mb-2">Описание</h4>
                <p className="text-sm text-[#133C2A]/70 bg-[#F8F4E3] p-4 rounded-xl">
                  {selectedTask.description}
                </p>
              </div>

              {/* Task Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-[#133C2A]/60">Назначил</p>
                  <p className="text-sm text-[#133C2A]">{selectedTask.assignedByName}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-[#133C2A]/60">Создано</p>
                  <p className="text-sm text-[#133C2A]">
                    {formatDate(selectedTask.createdAt)} в {formatTime(selectedTask.createdAt)}
                  </p>
                </div>

                {selectedTask.dueDate && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#133C2A]/60">Срок выполнения</p>
                    <p className={`text-sm ${isOverdue(selectedTask) ? 'text-red-500' : 'text-[#133C2A]'}`}>
                      {formatDate(selectedTask.dueDate)}
                      {isOverdue(selectedTask) && ' (Просрочено)'}
                    </p>
                  </div>
                )}

                {selectedTask.completedAt && (
                  <div className="space-y-1">
                    <p className="text-xs text-[#133C2A]/60">Выполнено</p>
                    <p className="text-sm text-green-600">
                      {formatDate(selectedTask.completedAt)} в {formatTime(selectedTask.completedAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedTask.notes && (
                <div>
                  <h4 className="text-sm text-[#133C2A] mb-2">Примечания</h4>
                  <p className="text-sm text-[#133C2A]/70 bg-[#F8F4E3] p-4 rounded-xl">
                    {selectedTask.notes}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              {selectedTask.status === 'pending' && (
                <Button
                  onClick={() => handleStartTask(selectedTask)}
                  className="bg-blue-500 text-white hover:bg-blue-600 rounded-xl"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Взять в работу
                </Button>
              )}

              {(selectedTask.status === 'pending' || selectedTask.status === 'in-progress') && (
                <Button
                  onClick={() => handleCompleteTask(selectedTask)}
                  className="bg-green-500 text-white hover:bg-green-600 rounded-xl"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Отметить выполненным
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                className="border-[#133C2A]/20 hover:bg-[#133C2A]/5 rounded-xl"
              >
                Закрыть
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}