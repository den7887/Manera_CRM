import { useEffect, useMemo, useState } from 'react';
import { Calendar, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Users } from 'lucide-react';
import { Group } from '../../types';
import {
  AdminChildRecord,
  assignAdminChildGroup,
  createOwnerGroup,
  deleteOwnerGroup,
  loadAdminChildren,
  loadOwnerGroups,
  updateOwnerGroup,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { EmptyState } from '../EmptyState';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { ResponsiveActionMenu } from '../ui/responsive-action-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const initialForm = {
  name: '',
  ageRange: '',
  scheduleDays: [] as string[],
  startTime: '',
  endTime: '',
  color: '#133C2A',
};

type SortBy = 'name' | 'students_desc';
type WeekdayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const weekDays: Array<{ id: WeekdayId; label: string }> = [
  { id: 'monday', label: 'Пн' },
  { id: 'tuesday', label: 'Вт' },
  { id: 'wednesday', label: 'Ср' },
  { id: 'thursday', label: 'Чт' },
  { id: 'friday', label: 'Пт' },
  { id: 'saturday', label: 'Сб' },
  { id: 'sunday', label: 'Вс' },
];

const weekdayMap = new Map<string, string>([
  ['пн', 'Пн'],
  ['понедельник', 'Пн'],
  ['mon', 'Пн'],
  ['monday', 'Пн'],
  ['вт', 'Вт'],
  ['вторник', 'Вт'],
  ['tue', 'Вт'],
  ['tues', 'Вт'],
  ['tuesday', 'Вт'],
  ['ср', 'Ср'],
  ['среда', 'Ср'],
  ['wed', 'Ср'],
  ['wednesday', 'Ср'],
  ['чт', 'Чт'],
  ['четверг', 'Чт'],
  ['thu', 'Чт'],
  ['thur', 'Чт'],
  ['thurs', 'Чт'],
  ['thursday', 'Чт'],
  ['пт', 'Пт'],
  ['пятница', 'Пт'],
  ['fri', 'Пт'],
  ['friday', 'Пт'],
  ['сб', 'Сб'],
  ['суббота', 'Сб'],
  ['sat', 'Сб'],
  ['saturday', 'Сб'],
  ['вс', 'Вс'],
  ['воскресенье', 'Вс'],
  ['sun', 'Вс'],
  ['sunday', 'Вс'],
]);

function formatSchedule(value?: string | null): string {
  if (!value?.trim()) return 'Расписание не задано';

  const parts = value
    .split(/[,/;]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'Расписание не задано';

  return parts
    .map((part) => {
      const match = part.match(/^([^\d]+?)(\s+\d{1,2}:\d{2}(?:\s*[-–—]\s*\d{1,2}:\d{2})?)?$/i);
      if (!match) return part;
      const weekdayRaw = match[1].trim().toLowerCase().replace(/\.+$/g, '');
      const timeRaw = match[2]?.trim() || '';
      const weekday = weekdayMap.get(weekdayRaw) || match[1].trim();
      return [weekday, timeRaw].filter(Boolean).join(' ');
    })
    .join(', ');
}

function normalizeScheduleDays(raw: unknown): WeekdayId[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is WeekdayId => typeof item === 'string' && weekDays.some((day) => day.id === item));
  }
  if (typeof raw !== 'string') {
    return [];
  }

  const text = raw.toLowerCase();
  const map: Array<[string, WeekdayId]> = [
    ['пн', 'monday'],
    ['пон', 'monday'],
    ['mon', 'monday'],
    ['monday', 'monday'],
    ['вт', 'tuesday'],
    ['вто', 'tuesday'],
    ['tue', 'tuesday'],
    ['tuesday', 'tuesday'],
    ['ср', 'wednesday'],
    ['сре', 'wednesday'],
    ['wed', 'wednesday'],
    ['wednesday', 'wednesday'],
    ['чт', 'thursday'],
    ['чет', 'thursday'],
    ['thu', 'thursday'],
    ['thursday', 'thursday'],
    ['пт', 'friday'],
    ['пят', 'friday'],
    ['fri', 'friday'],
    ['friday', 'friday'],
    ['сб', 'saturday'],
    ['суб', 'saturday'],
    ['sat', 'saturday'],
    ['saturday', 'saturday'],
    ['вс', 'sunday'],
    ['воск', 'sunday'],
    ['sun', 'sunday'],
    ['sunday', 'sunday'],
  ];

  return map
    .filter(([key]) => text.includes(key))
    .map(([, value]) => value)
    .filter((value, index, array) => array.indexOf(value) === index);
}

function parseTimeRange(raw: unknown): { startTime: string; endTime: string } {
  const text = String(raw || '').trim();
  const match = text.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
  if (!match) {
    return { startTime: '', endTime: '' };
  }
  return {
    startTime: match[1].padStart(5, '0'),
    endTime: match[2].padStart(5, '0'),
  };
}

function buildScheduleValue(days: WeekdayId[]): string {
  return weekDays
    .filter((day) => days.includes(day.id))
    .map((day) => day.id)
    .join(', ');
}

function buildTimeRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  return `${startTime}-${endTime}`;
}

function formatGroupTiming(group: Group): string {
  const schedule = formatSchedule(group.schedule);
  const time = String((group as any).time || '').trim();
  if (!time) return schedule;
  if (schedule === 'Расписание не задано') return time;
  if (schedule.includes(time)) return schedule;
  return `${schedule} • ${time}`;
}

function validateTimeRange(value: string): boolean {
  if (!value.trim()) return true;
  return /^(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})$/.test(value.trim());
}

export function OwnerGroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<AdminChildRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('students_desc');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedRosterGroupId, setSelectedRosterGroupId] = useState<string | null>(null);
  const [isRosterDialogOpen, setIsRosterDialogOpen] = useState(false);
  const [selectedChildToAddId, setSelectedChildToAddId] = useState<string>('');
  const [isAssigningChild, setIsAssigningChild] = useState(false);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [list, childList] = await Promise.all([
        loadOwnerGroups(),
        loadAdminChildren(),
      ]);
      setGroups(list);
      setChildren(childList);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить группы');
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

  const totals = useMemo(
    () => ({
      groups: groups.length,
      students: groups.reduce((sum, group) => sum + Number(group.studentCount || 0), 0),
      empty: groups.filter((group) => Number(group.studentCount || 0) === 0).length,
    }),
    [groups],
  );

  const rosterGroup = useMemo(
    () => groups.find((item) => item.id === selectedRosterGroupId) || null,
    [groups, selectedRosterGroupId],
  );

  const rosterChildren = useMemo(
    () => children
      .filter((child) => String(child.groupId || '') === String(selectedRosterGroupId || ''))
      .sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), 'ru')),
    [children, selectedRosterGroupId],
  );

  const availableChildrenForGroup = useMemo(
    () =>
      children
        .filter((child) => String(child.groupId || '') !== String(selectedRosterGroupId || ''))
        .sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || ''), 'ru')),
    [children, selectedRosterGroupId],
  );

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = groups.filter((group) => {
      const text = [
        group.name,
        group.ageRange,
        typeof group.schedule === 'string' ? group.schedule : '',
        String((group as any).time || ''),
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || text.includes(query);
      return matchesSearch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ru');
      }
      if (sortBy === 'students_desc') {
        return Number(b.studentCount || 0) - Number(a.studentCount || 0);
      }
      return 0;
    });
  }, [groups, search, sortBy]);

  const openCreate = () => {
    setEditingGroupId(null);
    setForm(initialForm);
    setIsDialogOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroupId(group.id);
    setForm({
      name: group.name || '',
      ageRange: group.ageRange || '',
      scheduleDays: normalizeScheduleDays(group.schedule),
      ...parseTimeRange((group as any).time || ''),
      color: group.color || '#133C2A',
    });
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.ageRange.trim()) {
      toast.error('Заполните название и возрастной диапазон');
      return;
    }
    if (form.scheduleDays.length === 0) {
      toast.error('Выберите хотя бы один день недели');
      return;
    }
    const timeRange = buildTimeRange(form.startTime, form.endTime);
    if (!form.startTime || !form.endTime || !validateTimeRange(timeRange)) {
      toast.error('Укажите время начала и окончания занятий');
      return;
    }
    const currentGroup = groups.find((group) => group.id === editingGroupId) || null;
    const maxCapacity = Number((currentGroup as any)?.maxCapacity || 12);
    if (!Number.isFinite(maxCapacity) || maxCapacity < 1 || maxCapacity > 200) {
      toast.error('Максимальная вместимость должна быть от 1 до 200');
      return;
    }
    const payload = {
      name: form.name.trim(),
      age_range: form.ageRange.trim(),
      teacher_id: null,
      teacher_name: null,
      schedule: buildScheduleValue(form.scheduleDays),
      time: timeRange,
      color: form.color,
      max_capacity: maxCapacity,
    };
    setIsSaving(true);
    try {
      if (editingGroupId) {
        await updateOwnerGroup(editingGroupId, payload);
        toast.success('Группа обновлена');
      } else {
        await createOwnerGroup(payload);
        toast.success('Группа создана');
      }
      setIsDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить группу');
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateGroup = async (group: Group) => {
    setDuplicatingId(group.id);
    try {
      const parsedTime = parseTimeRange((group as any).time || '');
      const payload = {
        name: `${group.name} (копия)`,
        age_range: group.ageRange || '',
        teacher_id: null,
        teacher_name: null,
        schedule: buildScheduleValue(normalizeScheduleDays(group.schedule)),
        time: buildTimeRange(parsedTime.startTime, parsedTime.endTime),
        color: group.color || '#133C2A',
        max_capacity: Number((group as any).maxCapacity || 12),
      };
      await createOwnerGroup(payload);
      toast.success('Группа продублирована');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось продублировать группу');
    } finally {
      setDuplicatingId(null);
    }
  };

  const remove = async (groupId: string) => {
    if (!window.confirm('Удалить группу?')) {
      return;
    }
    setDeletingId(groupId);
    try {
      await deleteOwnerGroup(groupId);
      setGroups((prev) => prev.filter((group) => group.id !== groupId));
      toast.success('Группа удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить группу');
    } finally {
      setDeletingId(null);
    }
  };

  const openRosterDialog = (group: Group) => {
    setSelectedRosterGroupId(group.id);
    setSelectedChildToAddId('');
    setIsRosterDialogOpen(true);
  };

  const addChildToSelectedGroup = async () => {
    if (!selectedRosterGroupId) {
      return;
    }
    if (!selectedChildToAddId) {
      toast.error('Выберите ученика');
      return;
    }

    setIsAssigningChild(true);
    try {
      await assignAdminChildGroup(selectedChildToAddId, { group_id: selectedRosterGroupId });
      toast.success('Ученик добавлен в группу');
      setSelectedChildToAddId('');
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить ученика в группу');
    } finally {
      setIsAssigningChild(false);
    }
  };

  const toggleScheduleDay = (dayId: WeekdayId) => {
    setForm((prev) => ({
      ...prev,
      scheduleDays: prev.scheduleDays.includes(dayId)
        ? prev.scheduleDays.filter((value) => value !== dayId)
        : [...prev.scheduleDays, dayId],
    }));
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Группы студии</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl">Обзор групп</h2>
            <p className="mt-1 text-sm text-white/72">Расписание, состав и загрузка групп в реальном времени.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/72">
            <span>{totals.groups} групп</span>
            <span>•</span>
            <span>{totals.students} учеников</span>
            <span>•</span>
            <span>{totals.empty} без учеников</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Группы</h1>
          <p className="text-[#133C2A]/60">Расписание и состав групп</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button onClick={openCreate} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
            <Plus className="w-4 h-4 mr-2" />
            Создать группу
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Групп всего</p><p className="mt-1 text-3xl text-[#133C2A]">{totals.groups}</p><p className="mt-2 text-xs text-[#133C2A]/45">Активные группы студии</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Учеников</p><p className="mt-1 text-3xl text-[#133C2A]">{totals.students}</p><p className="mt-2 text-xs text-[#133C2A]/45">Во всех группах вместе</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Без учеников</p><p className={`mt-1 text-3xl ${totals.empty > 0 ? 'text-[#D14343]' : 'text-[#133C2A]'}`}>{totals.empty}</p><p className="mt-2 text-xs text-[#133C2A]/45">Группы, куда пока никого не назначили</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Список групп</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или расписанию"
                className="pl-9 rounded-xl"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-[#133C2A]/20 md:hidden"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Поиск и сортировка
            </Button>
            <div className={`${isFiltersOpen ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-[1fr_220px]`}>
              <div className="hidden md:block" />
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="students_desc">По числу учеников</SelectItem>
                  <SelectItem value="name">По названию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : filteredGroups.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={groups.length === 0 ? 'Групп пока нет' : 'Ничего не найдено'}
              description={groups.length === 0 ? 'Создайте первую группу, чтобы начать набор учеников.' : 'Попробуйте изменить поиск или сортировку.'}
              actionLabel={groups.length === 0 ? 'Создать группу' : undefined}
              onAction={groups.length === 0 ? openCreate : undefined}
            />
          ) : (
            filteredGroups.map((group) => {
              return (
                <Card key={group.id} className="overflow-hidden border-[#133C2A]/10 bg-white/95 shadow-[0_8px_24px_rgba(19,60,42,0.05)]">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: group.color || '#133C2A' }}
                      >
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openRosterDialog(group)}
                              className="truncate text-left text-lg text-[#133C2A] hover:underline"
                            >
                              {group.name}
                            </button>
                            <p className="mt-1 text-sm text-[#133C2A]/62">{group.ageRange || 'Возраст не указан'}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Badge variant="outline" className="rounded-full whitespace-nowrap">
                              {group.studentCount} учеников
                            </Badge>
                            <ResponsiveActionMenu
                              title={group.name}
                              trigger={
                                <Button variant="outline" size="sm" className="h-9 rounded-xl border-[#133C2A]/15 px-3">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              }
                              items={[
                                { key: 'edit', label: 'Редактировать', onClick: () => openEdit(group) },
                                { key: 'duplicate', label: 'Дублировать', onClick: () => void duplicateGroup(group), disabled: duplicatingId === group.id },
                                { key: 'delete', label: 'Удалить', onClick: () => void remove(group.id), disabled: deletingId === group.id, destructive: true },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl bg-[#F8F4E3]/70 px-3 py-3">
                          <p className="text-xs text-[#133C2A]/45">Расписание</p>
                          <p className="mt-1 flex items-center gap-2 text-sm text-[#133C2A]">
                            <Calendar className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                            {formatGroupTiming(group)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openRosterDialog(group)}
                          className="mt-2 text-xs text-[#133C2A]/45 hover:text-[#133C2A]/70"
                        >
                          Нажмите, чтобы открыть состав
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={isRosterDialogOpen} onOpenChange={setIsRosterDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{rosterGroup ? rosterGroup.name : 'Состав группы'}</DialogTitle>
          </DialogHeader>
          {rosterGroup ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/70 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-[#133C2A]/50">Возраст</p>
                    <p className="mt-1 text-sm text-[#133C2A]">{rosterGroup.ageRange || 'Не указан'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#133C2A]/50">Учеников</p>
                    <p className="mt-1 text-sm text-[#133C2A]">{rosterChildren.length}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-[#133C2A]/72">
                  {formatGroupTiming(rosterGroup)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-3">
                  <p className="text-sm text-[#133C2A]">Добавить ученика в группу</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <Select value={selectedChildToAddId} onValueChange={setSelectedChildToAddId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Выберите ученика" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableChildrenForGroup.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            Нет доступных учеников
                          </SelectItem>
                        ) : (
                          availableChildrenForGroup.map((child) => (
                            <SelectItem key={child.id} value={child.id}>
                              {child.fullName || 'Ученик'}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={() => void addChildToSelectedGroup()}
                      disabled={isAssigningChild || !selectedChildToAddId || availableChildrenForGroup.length === 0}
                      className="rounded-xl bg-[#133C2A] hover:bg-[#0F3021]"
                    >
                      {isAssigningChild ? 'Добавляем...' : 'Добавить'}
                    </Button>
                  </div>
                </div>

                {rosterChildren.length === 0 ? (
                  <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4 text-sm text-[#133C2A]/60">
                    В группе пока нет учеников.
                  </div>
                ) : (
                  rosterChildren.map((child) => (
                    <div key={child.id} className="rounded-2xl border border-[#133C2A]/10 bg-white p-3">
                      <div className="min-w-0">
                        <p className="truncate text-[#133C2A]">{child.fullName || 'Ученик'}</p>
                        <p className="mt-1 text-xs text-[#133C2A]/58">
                          {child.age ? `${child.age} лет` : 'Возраст не указан'}
                        </p>
                        <p className="mt-1 text-xs text-[#133C2A]/58">
                          {child.parentName || 'Родитель не указан'}
                        </p>
                        {child.parentPhone ? (
                          <p className="mt-1 text-xs text-[#133C2A]/58">{child.parentPhone}</p>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{editingGroupId ? 'Редактировать группу' : 'Новая группа'}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Название</Label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Возраст</Label>
              <Input value={form.ageRange} onChange={(e) => setForm((prev) => ({ ...prev, ageRange: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Расписание</Label>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {weekDays.map((day) => {
                  const isActive = form.scheduleDays.includes(day.id);
                  return (
                    <Button
                      key={day.id}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      className="rounded-xl px-0"
                      onClick={() => toggleScheduleDay(day.id)}
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Время занятия</Label>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                />
                <span className="text-sm text-[#133C2A]/50">—</span>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
              <p className="text-xs text-[#133C2A]/50">
                Выбранное расписание: {form.scheduleDays.length > 0 ? formatSchedule(buildScheduleValue(form.scheduleDays)) : 'дни не выбраны'}
                {form.startTime && form.endTime ? ` • ${form.startTime}-${form.endTime}` : ''}
              </p>
            </div>
            <div className="space-y-1">
              <Label>Цвет</Label>
              <Input type="color" value={form.color} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} className="h-10 p-1" />
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
    </div>
  );
}
