import { useState } from 'react';
import { UserPlus, Save } from 'lucide-react';
import { Employee } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AddEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (employee: Omit<Employee, 'id'>) => void;
}

export function AddEmployeeDialog({
  isOpen,
  onClose,
  onAdd,
}: AddEmployeeDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: 'teacher' as 'teacher' | 'admin',
    email: '',
    phone: '',
    birthDate: '',
    experience: '',
    location: '',
  });

  // Полномочия по умолчанию для каждой роли
  const getDefaultPermissions = (role: string): string[] => {
    if (role === 'teacher') {
      return [
        'schedule.edit_own',
        'schedule.cancel',
        'schedule.mark_attendance',
        'students.view_contacts',
        'students.add_notes',
        'students.view_progress',
        'students.create_progress_reports',
        'students.view_subscriptions',
        'groups.view_statistics',
        'communication.send_individual',
        'communication.send_group',
      ];
    } else if (role === 'admin') {
      return [
        // Расписание
        'schedule.create',
        'schedule.edit',
        'schedule.delete',
        'schedule.cancel',
        'schedule.reschedule',
        'schedule.mark_attendance',
        'schedule.edit_attendance',
        'schedule.export',
        // Ученики
        'students.view_all',
        'students.create',
        'students.edit',
        'students.delete',
        'students.view_contacts',
        'students.edit_contacts',
        'students.add_notes',
        'students.edit_notes',
        'students.view_progress',
        'students.create_progress_reports',
        'students.view_subscriptions',
        'students.export',
        // Группы
        'groups.view_all',
        'groups.create',
        'groups.edit',
        'groups.delete',
        'groups.add_students',
        'groups.remove_students',
        'groups.assign_teachers',
        'groups.view_statistics',
        // Платежи и абонементы (операционные функции)
        'payments.create',
        'payments.edit',
        'subscriptions.create',
        'subscriptions.edit',
        'subscriptions.deactivate',
        'subscriptions.freeze',
        // Коммуникация
        'communication.send_individual',
        'communication.send_group',
        'communication.broadcast',
        'communication.create_templates',
        'communication.edit_templates',
        'communication.delete_templates',
        'communication.send_notifications',
        'news.create',
        'news.edit',
        'news.delete',
        // Задачи
        'tasks.view_all',
        'tasks.create',
        'tasks.edit',
        'tasks.assign',
        'tasks.change_status',
        'tasks.set_priority',
      ];
    }
    return [];
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      return;
    }

    const newEmployee: Omit<Employee, 'id'> = {
      name: formData.name,
      role: formData.role,
      email: formData.email,
      phone: formData.phone,
      status: 'active',
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
      experience: formData.experience || undefined,
      location: formData.location || undefined,
      permissions: getDefaultPermissions(formData.role),
    };

    onAdd(newEmployee);
    
    // Сброс формы
    setFormData({
      name: '',
      role: 'teacher',
      email: '',
      phone: '',
      birthDate: '',
      experience: '',
      location: '',
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            <span>Добавление нового сотрудника</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ФИО */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#133C2A]">
              ФИО <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите ФИО"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              required
            />
          </div>

          {/* Телефон */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[#133C2A]">
              Телефон <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#133C2A]">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@mail.com"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              required
            />
          </div>

          {/* Дата рождения */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-[#133C2A]">
              Дата рождения
            </Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Опыт работы */}
          <div className="space-y-2">
            <Label htmlFor="experience" className="text-[#133C2A]">
              Опыт работы
            </Label>
            <Input
              id="experience"
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder='10 лет коллектив "Тодес"'
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Место жительства */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-[#133C2A]">
              Место жительства
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="г. Краснодар, ул. Красная, д 164"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Роль */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-[#133C2A]">
              Роль <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'teacher' | 'admin') => {
                setFormData({ ...formData, role: value });
              }}
            >
              <SelectTrigger className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teacher">Преподаватель</SelectItem>
                <SelectItem value="admin">Администратор</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-[#133C2A]/60 bg-[#F8F4E3]/50 p-4 rounded-2xl">
            После создания сотруднику будут автоматически выданы базовые полномочия для выбранной роли.
            Вы сможете настроить их индивидуально через редактирование профиля.
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 rounded-2xl border-[#133C2A]/20"
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name || !formData.email || !formData.phone}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Добавить сотрудника
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}