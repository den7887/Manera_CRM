import { useEffect, useMemo, useState } from 'react';
import {
  Link2,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Unlink2,
  UserCheck,
} from 'lucide-react';
import { Employee, Group } from '../../types';
import {
  createOwnerEmployee,
  deleteOwnerEmployee,
  loadOwnerEmployees,
  loadOwnerGroups,
  updateOwnerEmployee,
  updateOwnerGroup,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

type EmployeeRole = 'teacher' | 'admin';
type EmployeeStatus = 'active' | 'inactive';
type RoleFilter = 'all' | EmployeeRole;
type StatusFilter = 'all' | EmployeeStatus;
type WorkloadFilter = 'all' | 'unassigned' | 'light' | 'normal' | 'heavy';
type PermissionTemplateKey = 'teacher_base' | 'admin_operational' | 'finance_manager' | 'custom';

interface PermissionAction {
  key: string;
  label: string;
}

interface PermissionSection {
  key: string;
  title: string;
  description: string;
  actions: PermissionAction[];
}

interface PermissionTemplate {
  key: Exclude<PermissionTemplateKey, 'custom'>;
  title: string;
  description: string;
  roles: EmployeeRole[];
  permissions: string[];
}

interface TeamFormState {
  id: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  email: string;
  status: EmployeeStatus;
  permissions: string[];
  permissionTemplate: PermissionTemplateKey;
}

const permissionSections: PermissionSection[] = [
  {
    key: 'dashboard',
    title: 'Главная',
    description: 'Доступ к сводке и ключевым показателям',
    actions: [
      { key: 'dashboard.view', label: 'Просмотр дашборда' },
      { key: 'dashboard.metrics', label: 'Просмотр метрик' },
    ],
  },
  {
    key: 'clients',
    title: 'Клиенты',
    description: 'Работа с карточками родителей и учеников',
    actions: [
      { key: 'clients.view', label: 'Просмотр клиентов' },
      { key: 'clients.create', label: 'Добавление клиентов' },
      { key: 'clients.edit', label: 'Редактирование клиентов' },
      { key: 'clients.group_assign', label: 'Назначение в группы' },
      { key: 'clients.private_notes', label: 'Внутренние комментарии' },
    ],
  },
  {
    key: 'groups',
    title: 'Группы и расписание',
    description: 'Управление группами и расписанием',
    actions: [
      { key: 'groups.view', label: 'Просмотр групп' },
      { key: 'groups.edit', label: 'Редактирование групп' },
      { key: 'groups.schedule', label: 'Изменение расписания' },
      { key: 'groups.attendance', label: 'Отметка посещаемости' },
    ],
  },
  {
    key: 'finance',
    title: 'Финансы',
    description: 'Счета, оплаты, статусы платежей',
    actions: [
      { key: 'finance.view', label: 'Просмотр финансов' },
      { key: 'finance.invoice_create', label: 'Выставление счетов' },
      { key: 'finance.cash_confirm', label: 'Подтверждение наличных' },
      { key: 'finance.status_update', label: 'Изменение статуса оплаты' },
      { key: 'finance.reminders', label: 'Отправка напоминаний' },
    ],
  },
  {
    key: 'communications',
    title: 'Коммуникации',
    description: 'Чаты и уведомления',
    actions: [
      { key: 'communications.view', label: 'Просмотр чатов' },
      { key: 'communications.reply', label: 'Ответы в чатах' },
      { key: 'communications.broadcast', label: 'Массовые сообщения' },
    ],
  },
  {
    key: 'content',
    title: 'Новости и мероприятия',
    description: 'Публикации и события для родителей',
    actions: [
      { key: 'content.view', label: 'Просмотр раздела' },
      { key: 'content.create', label: 'Создание публикаций' },
      { key: 'content.publish', label: 'Публикация/снятие с публикации' },
      { key: 'content.participants', label: 'Работа с участниками' },
    ],
  },
  {
    key: 'tasks',
    title: 'Задачи',
    description: 'Постановка и контроль задач',
    actions: [
      { key: 'tasks.view', label: 'Просмотр задач' },
      { key: 'tasks.create', label: 'Создание задач' },
      { key: 'tasks.assign', label: 'Назначение задач' },
      { key: 'tasks.close', label: 'Закрытие задач' },
    ],
  },
  {
    key: 'documents',
    title: 'Документы',
    description: 'Работа с файлами и доступами',
    actions: [
      { key: 'documents.view', label: 'Просмотр документов' },
      { key: 'documents.upload', label: 'Загрузка документов' },
      { key: 'documents.access_manage', label: 'Управление доступами' },
      { key: 'documents.delete', label: 'Удаление документов' },
    ],
  },
  {
    key: 'automations',
    title: 'Автоматизации',
    description: 'Конструктор и управление сценариями',
    actions: [
      { key: 'automations.view', label: 'Просмотр автоматизаций' },
      { key: 'automations.create', label: 'Создание сценариев' },
      { key: 'automations.edit', label: 'Редактирование сценариев' },
      { key: 'automations.delete', label: 'Удаление сценариев' },
    ],
  },
  {
    key: 'team',
    title: 'Команда',
    description: 'Управление сотрудниками и правами',
    actions: [
      { key: 'team.view', label: 'Просмотр команды' },
      { key: 'team.create', label: 'Добавление сотрудников' },
      { key: 'team.edit', label: 'Редактирование сотрудников' },
      { key: 'team.permissions', label: 'Изменение прав доступа' },
      { key: 'team.delete', label: 'Удаление сотрудников' },
    ],
  },
];

const allKnownPermissions = permissionSections.flatMap((section) => section.actions.map((action) => action.key));
const knownPermissionsSet = new Set(allKnownPermissions);

const permissionTemplates: PermissionTemplate[] = [
  {
    key: 'teacher_base',
    title: 'Преподаватель: базовый',
    description: 'Работа с группами, посещаемостью, задачами и чатами',
    roles: ['teacher'],
    permissions: [
      'dashboard.view',
      'clients.view',
      'groups.view',
      'groups.schedule',
      'groups.attendance',
      'communications.view',
      'communications.reply',
      'content.view',
      'tasks.view',
      'tasks.close',
      'documents.view',
    ],
  },
  {
    key: 'admin_operational',
    title: 'Администратор: операционный',
    description: 'Полная операционная работа без удаления сотрудников',
    roles: ['admin'],
    permissions: [
      'dashboard.view',
      'dashboard.metrics',
      'clients.view',
      'clients.create',
      'clients.edit',
      'clients.group_assign',
      'clients.private_notes',
      'groups.view',
      'groups.edit',
      'groups.schedule',
      'finance.view',
      'finance.invoice_create',
      'finance.cash_confirm',
      'finance.status_update',
      'finance.reminders',
      'communications.view',
      'communications.reply',
      'content.view',
      'content.create',
      'content.publish',
      'tasks.view',
      'tasks.create',
      'tasks.assign',
      'tasks.close',
      'documents.view',
      'documents.upload',
      'documents.access_manage',
      'automations.view',
      'automations.create',
      'automations.edit',
      'team.view',
      'team.edit',
    ],
  },
  {
    key: 'finance_manager',
    title: 'Администратор: финансы',
    description: 'Фокус на счетах и оплатах, минимум остальных прав',
    roles: ['admin'],
    permissions: [
      'dashboard.view',
      'clients.view',
      'finance.view',
      'finance.invoice_create',
      'finance.cash_confirm',
      'finance.status_update',
      'finance.reminders',
      'tasks.view',
      'tasks.create',
      'communications.view',
      'communications.reply',
      'documents.view',
    ],
  },
];

function normalizePhone(value: string): string {
  return value.replace(/\s+/g, '');
}

function normalizePermissions(value: string[]): string[] {
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  );
}

function samePermissionSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function templatesForRole(role: EmployeeRole): PermissionTemplate[] {
  return permissionTemplates.filter((template) => template.roles.includes(role));
}

function defaultTemplateByRole(role: EmployeeRole): PermissionTemplate {
  if (role === 'teacher') {
    return permissionTemplates.find((template) => template.key === 'teacher_base') || permissionTemplates[0];
  }
  return permissionTemplates.find((template) => template.key === 'admin_operational') || permissionTemplates[0];
}

function resolveTemplateKey(permissions: string[], role: EmployeeRole): PermissionTemplateKey {
  const normalized = normalizePermissions(permissions);
  const unknown = normalized.some((item) => !knownPermissionsSet.has(item));
  if (unknown) return 'custom';
  const roleTemplates = templatesForRole(role);
  const found = roleTemplates.find((template) => samePermissionSet(normalized, normalizePermissions(template.permissions)));
  return found?.key || 'custom';
}

function createDefaultForm(role: EmployeeRole = 'teacher'): TeamFormState {
  const template = defaultTemplateByRole(role);
  return {
    id: '',
    name: '',
    role,
    phone: '',
    email: '',
    status: 'active',
    permissions: normalizePermissions(template.permissions),
    permissionTemplate: template.key,
  };
}

function buildGroupUpdatePayload(group: Group, teacher: { id: string | null; name: string | null }) {
  return {
    name: group.name,
    age_range: group.ageRange,
    teacher_id: teacher.id,
    teacher_name: teacher.name,
    schedule: group.schedule || '',
    time: String((group as any).time || ''),
    color: group.color || '#133C2A',
    max_capacity: Number((group as any).maxCapacity || 12),
  };
}

export function OwnerTeamPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<TeamFormState>(createDefaultForm());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState<string | null>(null);
  const [assignGroupId, setAssignGroupId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigningGroupId, setIsUnassigningGroupId] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [team, groupsData] = await Promise.all([loadOwnerEmployees(), loadOwnerGroups()]);
      setEmployees(team);
      setGroups(groupsData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить сотрудников');
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const teacherGroupsById = useMemo(() => {
    const map = new Map<string, Group[]>();
    groups.forEach((group) => {
      if (!group.teacherId) return;
      const current = map.get(group.teacherId) || [];
      current.push(group);
      map.set(group.teacherId, current);
    });
    return map;
  }, [groups]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees
      .filter((item) => {
        const text = [item.name, item.phone, item.email || '', item.role, item.status].join(' ').toLowerCase();
        const matchesSearch = !query || text.includes(query);
        const matchesRole = roleFilter === 'all' || item.role === roleFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const teacherGroupCount = (teacherGroupsById.get(item.id) || []).length;
        const matchesWorkload =
          workloadFilter === 'all' ||
          (workloadFilter === 'unassigned' && item.role === 'teacher' && teacherGroupCount === 0) ||
          (workloadFilter === 'light' && item.role === 'teacher' && teacherGroupCount === 1) ||
          (workloadFilter === 'normal' && item.role === 'teacher' && teacherGroupCount >= 2 && teacherGroupCount <= 3) ||
          (workloadFilter === 'heavy' && item.role === 'teacher' && teacherGroupCount >= 4);
        return matchesSearch && matchesRole && matchesStatus && matchesWorkload;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [employees, search, roleFilter, statusFilter, workloadFilter, teacherGroupsById]);

  const totals = useMemo(() => {
    const teachers = employees.filter((item) => item.role === 'teacher');
    return {
      all: employees.length,
      teachers: teachers.length,
      admins: employees.filter((item) => item.role === 'admin').length,
      active: employees.filter((item) => item.status === 'active').length,
      teacherUnassigned: teachers.filter((item) => (teacherGroupsById.get(item.id) || []).length === 0).length,
      teacherHeavy: teachers.filter((item) => (teacherGroupsById.get(item.id) || []).length >= 4).length,
    };
  }, [employees, teacherGroupsById]);

  const assignEmployee = useMemo(
    () => employees.find((item) => item.id === assignEmployeeId) || null,
    [employees, assignEmployeeId],
  );

  const assignableGroups = useMemo(() => {
    if (!assignEmployee) return [];
    return groups.map((group) => ({
      ...group,
      isCurrentTeacher: group.teacherId === assignEmployee.id,
    }));
  }, [groups, assignEmployee]);

  const knownSelectedPermissions = useMemo(
    () => form.permissions.filter((item) => knownPermissionsSet.has(item)),
    [form.permissions],
  );
  const unknownSelectedPermissions = useMemo(
    () => form.permissions.filter((item) => !knownPermissionsSet.has(item)),
    [form.permissions],
  );
  const availableTemplates = useMemo(() => templatesForRole(form.role), [form.role]);

  const setPermissions = (nextKnownPermissions: string[]) => {
    const next = normalizePermissions([...nextKnownPermissions, ...unknownSelectedPermissions]);
    setForm((prev) => ({
      ...prev,
      permissions: next,
      permissionTemplate: resolveTemplateKey(next, prev.role),
    }));
  };

  const setRoleWithTemplate = (role: EmployeeRole) => {
    const defaultTemplate = defaultTemplateByRole(role);
    setForm((prev) => ({
      ...prev,
      role,
      permissions: normalizePermissions(defaultTemplate.permissions),
      permissionTemplate: defaultTemplate.key,
    }));
  };

  const applyTemplate = (templateKey: PermissionTemplateKey) => {
    if (templateKey === 'custom') return;
    const template = permissionTemplates.find((item) => item.key === templateKey);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      permissions: normalizePermissions([...template.permissions, ...unknownSelectedPermissions]),
      permissionTemplate: template.key,
    }));
  };

  const togglePermission = (permissionKey: string, checked: boolean) => {
    const knownSet = new Set(knownSelectedPermissions);
    if (checked) {
      knownSet.add(permissionKey);
    } else {
      knownSet.delete(permissionKey);
    }
    setPermissions(Array.from(knownSet));
  };

  const toggleSection = (section: PermissionSection, checked: boolean) => {
    const knownSet = new Set(knownSelectedPermissions);
    section.actions.forEach((action) => {
      if (checked) knownSet.add(action.key);
      else knownSet.delete(action.key);
    });
    setPermissions(Array.from(knownSet));
  };

  const openCreate = () => {
    setForm(createDefaultForm('teacher'));
    setIsDialogOpen(true);
  };

  const openEdit = (employee: Employee) => {
    const role = employee.role === 'admin' ? 'admin' : 'teacher';
    const permissions = normalizePermissions(Array.isArray(employee.permissions) ? employee.permissions : []);
    setForm({
      id: employee.id,
      name: employee.name,
      role,
      phone: employee.phone,
      email: employee.email || '',
      status: employee.status === 'inactive' ? 'inactive' : 'active',
      permissions,
      permissionTemplate: resolveTemplateKey(permissions, role),
    });
    setIsDialogOpen(true);
  };

  const save = async () => {
    const phone = normalizePhone(form.phone);
    if (!form.name.trim() || !phone) {
      toast.error('Заполните имя и телефон');
      return;
    }
    if (!/^\+?\d{10,15}$/.test(phone)) {
      toast.error('Телефон должен содержать 10-15 цифр');
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Некорректный email');
      return;
    }
    const payload = {
      name: form.name.trim(),
      role: form.role,
      phone,
      email: form.email.trim(),
      status: form.status,
      permissions: normalizePermissions(form.permissions),
    };
    setIsSaving(true);
    try {
      if (form.id) {
        await updateOwnerEmployee(form.id, payload);
        toast.success('Сотрудник обновлен');
      } else {
        await createOwnerEmployee(payload);
        toast.success('Сотрудник добавлен');
      }
      setIsDialogOpen(false);
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить сотрудника');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    try {
      const nextStatus = employee.status === 'active' ? 'inactive' : 'active';
      const updated = await updateOwnerEmployee(employee.id, {
        name: employee.name,
        role: employee.role === 'admin' ? 'admin' : 'teacher',
        phone: employee.phone,
        email: employee.email || '',
        status: nextStatus,
        permissions: employee.permissions || [],
      });
      setEmployees((prev) => prev.map((item) => (item.id === employee.id ? updated : item)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось изменить статус сотрудника');
    }
  };

  const openAssignDialog = (employee: Employee) => {
    setAssignEmployeeId(employee.id);
    setAssignGroupId('');
    setIsAssignDialogOpen(true);
  };

  const assignTeacherToGroup = async () => {
    if (!assignEmployee || !assignGroupId) {
      toast.error('Выберите группу');
      return;
    }
    const group = groups.find((item) => item.id === assignGroupId);
    if (!group) {
      toast.error('Группа не найдена');
      return;
    }
    setIsAssigning(true);
    try {
      await updateOwnerGroup(group.id, buildGroupUpdatePayload(group, { id: assignEmployee.id, name: assignEmployee.name }));
      toast.success(`Преподаватель назначен в группу "${group.name}"`);
      setIsAssignDialogOpen(false);
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось назначить преподавателя');
    } finally {
      setIsAssigning(false);
    }
  };

  const unassignTeacherFromGroup = async (group: Group) => {
    if (!group.teacherId) return;
    setIsUnassigningGroupId(group.id);
    try {
      await updateOwnerGroup(group.id, buildGroupUpdatePayload(group, { id: null, name: null }));
      toast.success(`Преподаватель снят с группы "${group.name}"`);
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось снять преподавателя');
    } finally {
      setIsUnassigningGroupId(null);
    }
  };

  const remove = async (employeeId: string) => {
    if (!window.confirm('Удалить сотрудника?')) {
      return;
    }
    try {
      await deleteOwnerEmployee(employeeId);
      setEmployees((prev) => prev.filter((item) => item.id !== employeeId));
      toast.success('Сотрудник удален');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить сотрудника');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#133C2A] mb-2">Команда</h1>
          <p className="text-[#133C2A]/60">Сотрудники, группы и гибкая настройка прав доступа</p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button onClick={openCreate} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
            <Plus className="w-4 h-4 mr-2" />
            Добавить сотрудника
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Всего</p><p className="text-2xl md:text-3xl text-[#133C2A]">{totals.all}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Преподаватели</p><p className="text-2xl md:text-3xl text-[#133C2A]">{totals.teachers}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Администраторы</p><p className="text-2xl md:text-3xl text-[#133C2A]">{totals.admins}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Активные</p><p className="text-2xl md:text-3xl text-[#133C2A]">{totals.active}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Без групп</p><p className="text-2xl md:text-3xl text-[#D14343]">{totals.teacherUnassigned}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4 md:p-5"><p className="text-xs md:text-sm text-[#133C2A]/60">Перегружены</p><p className="text-2xl md:text-3xl text-[#B8941F]">{totals.teacherHeavy}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Сотрудники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:hidden">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по команде" className="pl-9 rounded-xl" />
            </div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsFiltersOpen((prev) => !prev)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {isFiltersOpen ? 'Скрыть фильтры' : 'Фильтры'}
            </Button>
          </div>

          <div className={`${isFiltersOpen ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-[1fr_170px_170px_190px]`}>
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по команде" className="pl-9 rounded-xl" />
            </div>
            <Select value={roleFilter} onValueChange={(value: RoleFilter) => setRoleFilter(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="teacher">Преподаватели</SelectItem>
                <SelectItem value="admin">Администраторы</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: StatusFilter) => setStatusFilter(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workloadFilter} onValueChange={(value: WorkloadFilter) => setWorkloadFilter(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любая загрузка</SelectItem>
                <SelectItem value="unassigned">Без групп</SelectItem>
                <SelectItem value="light">1 группа</SelectItem>
                <SelectItem value="normal">2-3 группы</SelectItem>
                <SelectItem value="heavy">4+ групп</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : filteredEmployees.length === 0 ? (
            <p className="text-[#133C2A]/60">Сотрудники по текущему фильтру не найдены</p>
          ) : (
            filteredEmployees.map((employee) => {
              const teacherGroups = teacherGroupsById.get(employee.id) || [];
              const permissionsCount = Array.isArray(employee.permissions) ? employee.permissions.length : 0;
              return (
                <div key={employee.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#133C2A]">{employee.name}</p>
                        <Badge variant="outline" className="rounded-xl">
                          {employee.role === 'teacher' ? 'Преподаватель' : 'Администратор'}
                        </Badge>
                        <Badge variant="outline" className="rounded-xl">
                          {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                        </Badge>
                        <Badge variant="outline" className="rounded-xl">
                          Прав: {permissionsCount}
                        </Badge>
                        {employee.role === 'teacher' && (
                          <Badge variant="outline" className="rounded-xl">
                            Групп: {teacherGroups.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-[#133C2A]/70 pt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {employee.phone}
                        </span>
                        {employee.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {employee.email}
                          </span>
                        ) : null}
                      </div>
                      {employee.role === 'teacher' && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {teacherGroups.length === 0 ? (
                            <Badge variant="outline" className="rounded-xl border-[#D4AF37]/30 text-[#B8941F]">
                              Нет назначенных групп
                            </Badge>
                          ) : (
                            teacherGroups.map((group) => (
                              <div key={group.id} className="inline-flex items-center gap-1 rounded-xl border border-[#133C2A]/10 px-2 py-1 text-xs text-[#133C2A]/80">
                                <span>{group.name}</span>
                                <button
                                  type="button"
                                  className="text-[#D14343] hover:opacity-80"
                                  onClick={() => void unassignTeacherFromGroup(group)}
                                  disabled={isUnassigningGroupId === group.id}
                                  title="Снять с группы"
                                >
                                  <Unlink2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <div className="flex items-center gap-2 rounded-xl border border-[#133C2A]/10 px-2 py-1">
                        <UserCheck className="w-4 h-4 text-[#133C2A]/70" />
                        <Switch checked={employee.status === 'active'} onCheckedChange={() => void toggleEmployeeStatus(employee)} />
                      </div>
                      {employee.role === 'teacher' && (
                        <Button size="sm" variant="outline" onClick={() => openAssignDialog(employee)} className="rounded-xl">
                          <Link2 className="w-4 h-4 mr-1" />
                          Назначить
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEdit(employee)} className="rounded-xl">
                        Изменить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void remove(employee.id)} className="rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl w-[96vw] !max-w-[96vw] xl:!max-w-[1100px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{form.id ? 'Редактирование сотрудника' : 'Новый сотрудник'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ФИО</Label>
                <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Телефон</Label>
                <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Роль</Label>
                <Select value={form.role} onValueChange={(value: EmployeeRole) => setRoleWithTemplate(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Преподаватель</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 lg:col-span-2">
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(value: EmployeeStatus) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="inactive">Неактивен</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border border-[#133C2A]/10 p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-[#133C2A]">Права доступа</p>
                  <p className="text-sm text-[#133C2A]/60">
                    Выбрано: {knownSelectedPermissions.length} из {allKnownPermissions.length}
                    {unknownSelectedPermissions.length > 0 ? ` • Нестандартных: ${unknownSelectedPermissions.length}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setPermissions(allKnownPermissions)}
                  >
                    Выбрать все
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setPermissions([])}
                  >
                    Очистить
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Шаблон прав</Label>
                <Select value={form.permissionTemplate} onValueChange={(value: PermissionTemplateKey) => applyTemplate(value)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTemplates.map((template) => (
                      <SelectItem key={template.key} value={template.key}>
                        {template.title}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Кастомный набор</SelectItem>
                  </SelectContent>
                </Select>
                {form.permissionTemplate !== 'custom' ? (
                  <p className="text-xs text-[#133C2A]/55">
                    {permissionTemplates.find((template) => template.key === form.permissionTemplate)?.description || ''}
                  </p>
                ) : (
                  <p className="text-xs text-[#133C2A]/55">Набор прав изменен вручную.</p>
                )}
              </div>

              <Accordion type="multiple" defaultValue={permissionSections.map((section) => section.key)} className="rounded-xl border border-[#133C2A]/10 px-3">
                {permissionSections.map((section) => {
                  const selectedCount = section.actions.filter((action) => knownSelectedPermissions.includes(action.key)).length;
                  const allSelected = selectedCount === section.actions.length;
                  const someSelected = selectedCount > 0 && selectedCount < section.actions.length;
                  return (
                    <AccordionItem key={section.key} value={section.key}>
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-start gap-3 w-full">
                          <Checkbox
                            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                            onClick={(event) => event.stopPropagation()}
                            onCheckedChange={(checked) => toggleSection(section, checked === true)}
                            className="mt-1"
                          />
                          <div className="text-left">
                            <p className="text-[#133C2A]">{section.title}</p>
                            <p className="text-xs text-[#133C2A]/60">{section.description}</p>
                          </div>
                          <Badge variant="outline" className="ml-auto rounded-xl">
                            {selectedCount}/{section.actions.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid md:grid-cols-2 gap-2 pt-2">
                          {section.actions.map((action) => (
                            <label key={action.key} className="flex items-center gap-2 rounded-lg border border-[#133C2A]/10 px-3 py-2">
                              <Checkbox
                                checked={knownSelectedPermissions.includes(action.key)}
                                onCheckedChange={(checked) => togglePermission(action.key, checked === true)}
                              />
                              <span className="text-sm text-[#133C2A]">{action.label}</span>
                            </label>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button onClick={() => void save()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" disabled={isSaving}>
              {isSaving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Назначение в группу</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-[#133C2A]/10 p-3 text-sm text-[#133C2A]/80">
              Преподаватель: {assignEmployee?.name || '—'}
            </div>
            <div className="space-y-1">
              <Label>Группа</Label>
              <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                <SelectTrigger><SelectValue placeholder="Выберите группу" /></SelectTrigger>
                <SelectContent>
                  {assignableGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                      {group.teacherName ? ` • сейчас: ${group.teacherName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button
              onClick={() => void assignTeacherToGroup()}
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
              disabled={isAssigning || !assignGroupId}
            >
              {isAssigning ? 'Назначаем...' : 'Назначить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
