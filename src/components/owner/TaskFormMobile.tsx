import { useState, useEffect } from 'react';
import { X, Plus, Calendar as CalendarIcon, User, Flag, Tag } from 'lucide-react';
import { Task } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface TaskFormMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  employees: { id: string; name: string }[];
}

export function TaskFormMobile({ isOpen, onClose, onSave, task, employees }: TaskFormMobileProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    assigneeId: '',
    assigneeName: '',
    priority: 'medium',
    category: 'general',
    status: 'todo',
    dueDate: undefined,
    scheduledDate: undefined,
  });
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        scheduledDate: task.scheduledDate ? new Date(task.scheduledDate) : undefined,
      });
      setIsScheduled(!!task.scheduledDate);
    } else {
      setFormData({
        title: '',
        description: '',
        assigneeId: '',
        assigneeName: '',
        priority: 'medium',
        category: 'general',
        status: 'todo',
        dueDate: undefined,
        scheduledDate: undefined,
      });
      setIsScheduled(false);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assigneeId) return;

    onSave(formData);
    onClose();
  };

  const handleAssigneeChange = (value: string) => {
    const employee = employees.find(e => e.id === value);
    setFormData({
      ...formData,
      assigneeId: value,
      assigneeName: employee?.name || '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in">
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#133C2A]/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-[#133C2A]">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#133C2A]/5 flex items-center justify-center hover:bg-[#133C2A]/10 transition-smooth"
          >
            <X className="w-5 h-5 text-[#133C2A]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 pb-24">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Название задачи *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Например: Подготовить расписание"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Добавьте детали задачи..."
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[100px]"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Исполнитель *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] pointer-events-none z-10" />
              <select
                id="assignee"
                value={formData.assigneeId}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="w-full rounded-2xl border border-[#133C2A]/20 bg-white px-10 py-3 text-[#133C2A] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-smooth appearance-none cursor-pointer"
                required
              >
                <option value="">Выберите исполнителя</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-[#133C2A]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Приоритет</Label>
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] pointer-events-none z-10" />
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                  className="w-full rounded-2xl border border-[#133C2A]/20 bg-white px-10 py-3 text-[#133C2A] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-smooth appearance-none cursor-pointer"
                >
                  <option value="urgent">Срочно</option>
                  <option value="high">Высокий</option>
                  <option value="medium">Средний</option>
                  <option value="low">Низкий</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#133C2A]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] pointer-events-none z-10" />
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-2xl border border-[#133C2A]/20 bg-white px-10 py-3 text-[#133C2A] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-smooth appearance-none cursor-pointer"
                >
                  <option value="general">Общие</option>
                  <option value="finance">Финансы</option>
                  <option value="students">Ученики</option>
                  <option value="schedule">Расписание</option>
                  <option value="marketing">Маркетинг</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#133C2A]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="dueDate">Срок выполнения</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  dueDate: e.target.value ? new Date(e.target.value) : undefined 
                })}
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] pl-10"
              />
            </div>
          </div>

          {/* Scheduled Task */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#F8F4E3] border border-[#133C2A]/10">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isScheduled"
                checked={isScheduled}
                onChange={(e) => {
                  setIsScheduled(e.target.checked);
                  if (!e.target.checked) {
                    setFormData({ ...formData, scheduledDate: undefined });
                  }
                }}
                className="w-5 h-5 mt-0.5 rounded border-[#133C2A]/20 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
              />
              <div className="flex-1">
                <Label htmlFor="isScheduled" className="text-[#133C2A] cursor-pointer">
                  Отложенная задача
                </Label>
                <p className="text-xs text-[#133C2A]/60 mt-0.5">
                  Задача будет показана исполнителю только в указанную дату
                </p>
              </div>
            </div>

            {isScheduled && (
              <div className="space-y-2 pt-2 border-t border-[#133C2A]/10">
                <Label htmlFor="scheduledDate" className="text-[#133C2A]">
                  Дата начала задачи
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]" />
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate ? new Date(formData.scheduledDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      scheduledDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] pl-10"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                {formData.scheduledDate && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-[#D4AF37]/20">
                    <CalendarIcon className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                    <p className="text-xs text-[#133C2A]">
                      Задача появится у исполнителя {new Date(formData.scheduledDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status (only for editing) */}
          {task && (
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <div className="relative">
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                  className="w-full rounded-2xl border border-[#133C2A]/20 bg-white px-4 py-3 text-[#133C2A] focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-smooth appearance-none cursor-pointer"
                >
                  <option value="todo">К выполнению</option>
                  <option value="in-progress">В процессе</option>
                  <option value="done">Выполнено</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#133C2A]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-2xl border-[#133C2A]/20"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              disabled={!formData.title || !formData.assigneeId}
            >
              {task ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}