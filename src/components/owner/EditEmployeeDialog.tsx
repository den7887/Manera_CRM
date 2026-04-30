import { useState, useEffect } from 'react';
import { UserX, Lock, Unlock, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { Employee } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

interface EditEmployeeDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  onDismiss: (employeeId: string) => void;
  onToggleStatus: (employeeId: string) => void;
}

export function EditEmployeeDialog({
  employee,
  isOpen,
  onClose,
  onSave,
  onDismiss,
  onToggleStatus,
}: EditEmployeeDialogProps) {
  const [formData, setFormData] = useState<Employee | null>(employee);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Обновляем formData когда меняется employee
  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
    }
  }, [employee]);

  if (!formData) return null;

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
        // Автоматизации убраны - доступны только владельцу по умолчанию
      ];
    }
    return [];
  };

  // Детальная структура полномочий по разделам
  const permissionSections = [
    {
      id: 'schedule',
      label: 'Расписание',
      roles: ['teacher', 'admin'],
      permissions: [
        { id: 'schedule.create', label: 'Создание занятий', adminOnly: true },
        { id: 'schedule.edit', label: 'Редактирование занятий', adminOnly: true },
        { id: 'schedule.edit_own', label: 'Редактирование своих занятий', teacherOnly: true },
        { id: 'schedule.delete', label: 'Удаление занятий', adminOnly: true },
        { id: 'schedule.cancel', label: 'Отмена занятий' },
        { id: 'schedule.reschedule', label: 'Перенос занятий', adminOnly: true },
        { id: 'schedule.mark_attendance', label: 'Отметка посещаемости' },
        { id: 'schedule.edit_attendance', label: 'Редактирование посещаемости', adminOnly: true },
        { id: 'schedule.export', label: 'Экспорт расписания', adminOnly: true },
      ],
    },
    {
      id: 'students',
      label: 'Ученики',
      roles: ['teacher', 'admin'],
      permissions: [
        { id: 'students.view_all', label: 'Просмотр всех учеников студии (не только своих групп)', adminOnly: true },
        { id: 'students.create', label: 'Добавление новых учеников', adminOnly: true },
        { id: 'students.edit', label: 'Редактирование личных данных учеников', adminOnly: true },
        { id: 'students.delete', label: 'Удаление учеников', adminOnly: true },
        { id: 'students.view_contacts', label: 'Просмотр контактов родителей' },
        { id: 'students.edit_contacts', label: 'Редактирование данных родителей', adminOnly: true },
        { id: 'students.add_notes', label: 'Добавление заметок об учениках' },
        { id: 'students.edit_notes', label: 'Редактирование чужих заметок', adminOnly: true },
        { id: 'students.view_progress', label: 'Просмотр отчетов о прогрессе' },
        { id: 'students.create_progress_reports', label: 'Создание отчетов о прогрессе' },
        { id: 'students.view_subscriptions', label: 'Просмотр информации об абонементах' },
        { id: 'students.export', label: 'Экспорт данных учеников', adminOnly: true },
      ],
    },
    {
      id: 'groups',
      label: 'Группы',
      roles: ['teacher', 'admin'],
      permissions: [
        { id: 'groups.view_all', label: 'Просмотр всех групп студии (не только назначенных)', adminOnly: true },
        { id: 'groups.create', label: 'Создание новых групп', adminOnly: true },
        { id: 'groups.edit', label: 'Ретирование групп', adminOnly: true },
        { id: 'groups.delete', label: 'Удаление групп', adminOnly: true },
        { id: 'groups.add_students', label: 'Добавление учеников в группу', adminOnly: true },
        { id: 'groups.remove_students', label: 'Удаление учеников из группы', adminOnly: true },
        { id: 'groups.assign_teachers', label: 'Назначение преподавателей на группы', adminOnly: true },
        { id: 'groups.view_statistics', label: 'Просмотр статистики группы' },
      ],
    },
    {
      id: 'payments',
      label: 'Платежи и абонементы',
      roles: ['admin'],
      permissions: [
        { id: 'payments.create', label: 'Создание платежей' },
        { id: 'payments.edit', label: 'Редактирование платежей' },
        { id: 'subscriptions.create', label: 'Создание абонементов' },
        { id: 'subscriptions.edit', label: 'Изменение абонементов' },
        { id: 'subscriptions.deactivate', label: 'Деактивация абонементов' },
        { id: 'subscriptions.freeze', label: 'Заморозка абонементов' },
      ],
    },
    {
      id: 'communication',
      label: 'Коммуникация',
      roles: ['teacher', 'admin'],
      permissions: [
        { id: 'communication.send_individual', label: 'Отправка индивидуальных сообщений родителям' },
        { id: 'communication.send_group', label: 'Отправка сообщений всей группе' },
        { id: 'communication.broadcast', label: 'Массовые рассылки всем родителям', adminOnly: true },
        { id: 'communication.create_templates', label: 'Создание шаблонов сообщений', adminOnly: true },
        { id: 'communication.edit_templates', label: 'Редактирование шаблонов', adminOnly: true },
        { id: 'communication.delete_templates', label: 'Удаление шаблонов', adminOnly: true },
        { id: 'communication.send_notifications', label: 'Отправка push-уведомлений', adminOnly: true },
        { id: 'news.create', label: 'Публикация новостей', adminOnly: true },
        { id: 'news.edit', label: 'Редактирование новостей', adminOnly: true },
        { id: 'news.delete', label: 'Удаление новостей', adminOnly: true },
      ],
    },
    {
      id: 'tasks',
      label: 'Задачи',
      roles: ['admin'],
      permissions: [
        { id: 'tasks.view_all', label: 'Просмотр всех задач студии' },
        { id: 'tasks.create', label: 'Создание задач' },
        { id: 'tasks.edit', label: 'Редактирование любых задач' },
        { id: 'tasks.assign', label: 'Назначение задач на сотрудников' },
        { id: 'tasks.change_status', label: 'Изменение статуса задач' },
        { id: 'tasks.set_priority', label: 'Изменение приоритета' },
        // Автоматизации убраны - доступны только владельцу по умолчанию
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handlePermissionToggle = (permissionId: string) => {
    const currentPermissions = formData.permissions || [];
    const newPermissions = currentPermissions.includes(permissionId)
      ? currentPermissions.filter((p) => p !== permissionId)
      : [...currentPermissions, permissionId];
    
    setFormData({ ...formData, permissions: newPermissions });
  };

  const handleSectionToggle = (sectionId: string, permissions: any[]) => {
    const currentPermissions = formData.permissions || [];
    const sectionPermissionIds = permissions
      .filter((p) => formData.role === 'admin' || !p.adminOnly)
      .map((p) => p.id);
    
    const allSelected = sectionPermissionIds.every((id) =>
      currentPermissions.includes(id)
    );

    if (allSelected) {
      // Убрать все полномочия раздела
      setFormData({
        ...formData,
        permissions: currentPermissions.filter((p) => !sectionPermissionIds.includes(p)),
      });
    } else {
      // Добавить все полномочия раздела
      const newPermissions = [...new Set([...currentPermissions, ...sectionPermissionIds])];
      setFormData({ ...formData, permissions: newPermissions });
    }
  };

  const isSectionFullySelected = (permissions: any[]) => {
    const currentPermissions = formData.permissions || [];
    const sectionPermissionIds = permissions
      .filter((p) => formData.role === 'admin' || !p.adminOnly)
      .map((p) => p.id);
    
    return (
      sectionPermissionIds.length > 0 &&
      sectionPermissionIds.every((id) => currentPermissions.includes(id))
    );
  };

  const isSectionPartiallySelected = (permissions: any[]) => {
    const currentPermissions = formData.permissions || [];
    const sectionPermissionIds = permissions
      .filter((p) => formData.role === 'admin' || !p.adminOnly)
      .map((p) => p.id);
    
    const selectedCount = sectionPermissionIds.filter((id) =>
      currentPermissions.includes(id)
    ).length;

    return selectedCount > 0 && selectedCount < sectionPermissionIds.length;
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const handleDismiss = () => {
    if (window.confirm(`Вы уверены, что хотите уволить ${formData.name}?`)) {
      onDismiss(formData.id);
      onClose();
    }
  };

  const handleToggleStatus = () => {
    const action = formData.status === 'active' ? 'заблокировать' : 'активировать';
    if (window.confirm(`Вы уверены, что хотите ${action} профиль ${formData.name}?`)) {
      onToggleStatus(formData.id);
      setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' });
    }
  };

  const filteredPermissions = permissionSections.filter((p) =>
    p.roles.includes(formData.role)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] flex items-center justify-between">
            <span>Редактирование сотрудника</span>
            <Badge
              className={
                formData.status === 'active'
                  ? 'bg-[#1C8C64]/20 text-[#1C8C64] border-[#1C8C64]/30'
                  : 'bg-gray-200 text-gray-600 border-gray-300'
              }
            >
              {formData.status === 'active' ? 'Активен' : 'Заблокирован'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ФИО */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[#133C2A]">
              ФИО
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Телефон */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[#133C2A]">
              Телефон
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#133C2A]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
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
              value={formData.birthDate ? new Date(formData.birthDate).toISOString().split('T')[0] : ''}
              onChange={(e) =>
                setFormData({ ...formData, birthDate: e.target.value ? new Date(e.target.value) : undefined })
              }
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
              value={formData.experience || ''}
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
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="г. Краснодар, ул. Красная, д 164"
              className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
            />
          </div>

          {/* Роль */}
          <div className="space-y-2">
            <Label htmlFor="role" className="text-[#133C2A]">
              Роль
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value: any) => {
                setFormData({ ...formData, role: value, permissions: getDefaultPermissions(value) });
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

          {/* Полномочия */}
          <div className="space-y-3">
            <Label className="text-[#133C2A]">Полномочия (доступные функции)</Label>
            <div className="space-y-3 p-4 rounded-2xl bg-[#F8F4E3]/50 border border-[#133C2A]/10">
              {filteredPermissions.length > 0 ? (
                filteredPermissions.map((section) => {
                  const isExpanded = expandedSections.includes(section.id);
                  const availablePermissions = section.permissions.filter(
                    (p) => formData.role === 'admin' || !p.adminOnly
                  );
                  
                  return (
                    <div key={section.id} className="rounded-xl bg-white/50 p-3">
                      {/* Section Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            id={`section-${section.id}`}
                            checked={isSectionFullySelected(section.permissions)}
                            onCheckedChange={() => handleSectionToggle(section.id, section.permissions)}
                            className="border-[#133C2A]/30 data-[state=checked]:bg-[#133C2A]"
                          />
                          <label
                            htmlFor={`section-${section.id}`}
                            className="text-[#133C2A] cursor-pointer flex-1"
                          >
                            {section.label}
                            <Badge className="ml-2 bg-[#D4AF37]/20 text-[#D4AF37] border-0">
                              {availablePermissions.filter((p) => (formData.permissions || []).includes(p.id)).length}/{availablePermissions.length}
                            </Badge>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSection(section.id)}
                          className="p-1 hover:bg-[#133C2A]/5 rounded-lg transition-smooth"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#133C2A]/60" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#133C2A]/60" />
                          )}
                        </button>
                      </div>

                      {/* Section Permissions */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2 pl-8 border-l-2 border-[#D4AF37]/20 ml-2">
                          {availablePermissions.map((permission) => (
                            <div key={permission.id} className="flex items-center gap-3">
                              <Checkbox
                                id={permission.id}
                                checked={(formData.permissions || []).includes(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                                className="border-[#133C2A]/30 data-[state=checked]:bg-[#133C2A]"
                              />
                              <label
                                htmlFor={permission.id}
                                className="text-sm text-[#133C2A]/80 cursor-pointer flex-1"
                              >
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[#133C2A]/60 text-center py-2">
                  Выберите роль для настройки полномочий
                </p>
              )}
            </div>
          </div>

          {/* Действия */}
          <div className="space-y-3 pt-4 border-t border-[#133C2A]/10">
            <div className="flex gap-3">
              <Button
                onClick={handleToggleStatus}
                variant="outline"
                className={`flex-1 rounded-2xl gap-2 ${
                  formData.status === 'active'
                    ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                    : 'border-[#1C8C64]/30 text-[#1C8C64] hover:bg-[#1C8C64]/10'
                }`}
              >
                {formData.status === 'active' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    Заблокировать профиль
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Активировать профиль
                  </>
                )}
              </Button>
            </div>

            <Button
              onClick={handleDismiss}
              variant="outline"
              className="w-full rounded-2xl border-red-300 text-red-600 hover:bg-red-50 gap-2"
            >
              <UserX className="w-4 h-4" />
              Уволить сотрудника
            </Button>
          </div>

          {/* Кно��ки сохранения */}
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
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
            >
              <Save className="w-4 h-4" />
              Сохранить изменения
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}