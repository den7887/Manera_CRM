import { useEffect, useMemo, useState } from 'react';
import { Calendar, Copy, Edit, Plus, RefreshCw, Search, Shuffle, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { Group } from '../../types';
import {
  AdminChildRecord,
  createOwnerGroup,
  deleteOwnerGroup,
  loadAdminChildren,
  loadOwnerEmployees,
  loadOwnerGroups,
  updateOwnerGroup,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';

const initialForm = {
  name: '',
  ageRange: '',
  teacherId: '',
  teacherName: '',
  schedule: '',
  time: '',
  color: '#133C2A',
  maxCapacity: '12',
};

type OccupancyFilter = 'all' | 'needs_students' | 'balanced' | 'full' | 'overflow';
type SortBy = 'name' | 'occupancy_desc' | 'occupancy_asc' | 'students_desc';

interface TeacherReplacement {
  id: string;
  groupId: string;
  groupName: string;
  previousTeacherId: string;
  previousTeacherName: string;
  replacementTeacherId: string;
  replacementTeacherName: string;
  reason: string;
  startsAt: string;
  endsAt?: string | null;
  status: 'active' | 'completed';
  createdAt: string;
}

const GROUP_REPLACEMENTS_KEY = 'manera_owner_group_replacements_v1';

function loadStoredReplacements(): TeacherReplacement[] {
  try {
    const raw = window.localStorage.getItem(GROUP_REPLACEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === 'object');
  } catch {
    return [];
  }
}

function saveStoredReplacements(items: TeacherReplacement[]) {
  window.localStorage.setItem(GROUP_REPLACEMENTS_KEY, JSON.stringify(items));
}

function toDateValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function occupancyPercent(group: Group): number {
  const maxCapacity = Math.max(1, Number((group as any).maxCapacity || 12));
  const students = Math.max(0, Number(group.studentCount || 0));
  return Math.round((students / maxCapacity) * 100);
}

function occupancyLabel(percent: number): string {
  if (percent > 100) return 'Переполнена';
  if (percent >= 90) return 'Почти полная';
  if (percent >= 45) return 'Сбалансирована';
  return 'Нужен набор';
}

function occupancyBadgeClass(percent: number): string {
  if (percent > 100) return 'border-red-200 text-red-700 bg-red-50';
  if (percent >= 90) return 'border-[#D4AF37]/40 text-[#B8941F] bg-[#FFF9E8]';
  if (percent >= 45) return 'border-green-200 text-green-700 bg-green-50';
  return 'border-blue-200 text-blue-700 bg-blue-50';
}

function validateTimeRange(value: string): boolean {
  if (!value.trim()) return true;
  return /^(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})$/.test(value.trim());
}

export function OwnerGroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<AdminChildRecord[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [replacements, setReplacements] = useState<TeacherReplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState('');
  const [occupancyFilter, setOccupancyFilter] = useState<OccupancyFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('occupancy_desc');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [substitutionGroupId, setSubstitutionGroupId] = useState<string | null>(null);
  const [isSubstitutionDialogOpen, setIsSubstitutionDialogOpen] = useState(false);
  const [selectedRosterGroupId, setSelectedRosterGroupId] = useState<string | null>(null);
  const [isRosterDialogOpen, setIsRosterDialogOpen] = useState(false);
  const [replacementTeacherId, setReplacementTeacherId] = useState<string>('');
  const [replacementReason, setReplacementReason] = useState('');
  const [replacementStartsAt, setReplacementStartsAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [replacementEndsAt, setReplacementEndsAt] = useState('');
  const [replacementMakeCurrent, setReplacementMakeCurrent] = useState(false);
  const [isApplyingReplacement, setIsApplyingReplacement] = useState(false);
  const [completingReplacementId, setCompletingReplacementId] = useState<string | null>(null);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [list, employees, childList] = await Promise.all([
        loadOwnerGroups(),
        loadOwnerEmployees(),
        loadAdminChildren(),
      ]);
      setTeacherOptions(
        employees
          .filter((item) => item.role === 'teacher' && item.status === 'active')
          .map((item) => ({ id: item.id, name: item.name })),
      );
      setGroups(list);
      setChildren(childList);
      const persisted = loadStoredReplacements().filter((item) => list.some((group) => group.id === item.groupId));
      if (persisted.length !== loadStoredReplacements().length) {
        saveStoredReplacements(persisted);
      }
      setReplacements(persisted);
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
      capacity: groups.reduce((sum, group) => sum + Number((group as any).maxCapacity || 12), 0),
      highLoad: groups.filter((group) => occupancyPercent(group) >= 90).length,
      withoutTeacher: groups.filter((group) => !(group.teacherId || group.teacherName)).length,
      substitutionsActive: replacements.filter((item) => item.status === 'active').length,
    }),
    [groups, replacements],
  );
  const averageUtilization = totals.capacity > 0 ? Math.round((totals.students / totals.capacity) * 100) : 0;

  const activeReplacementByGroupId = useMemo(() => {
    const map = new Map<string, TeacherReplacement>();
    replacements
      .filter((item) => item.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((item) => {
        if (!map.has(item.groupId)) {
          map.set(item.groupId, item);
        }
      });
    return map;
  }, [replacements]);

  const recentReplacements = useMemo(
    () =>
      [...replacements]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [replacements],
  );

  const substitutionGroup = useMemo(
    () => groups.find((item) => item.id === substitutionGroupId) || null,
    [groups, substitutionGroupId],
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

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = groups.filter((group) => {
      const text = [
        group.name,
        group.ageRange,
        group.teacherName,
        typeof group.schedule === 'string' ? group.schedule : '',
        String((group as any).time || ''),
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !query || text.includes(query);
      const percent = occupancyPercent(group);
      const matchesOccupancy =
        occupancyFilter === 'all' ||
        (occupancyFilter === 'needs_students' && percent < 45) ||
        (occupancyFilter === 'balanced' && percent >= 45 && percent < 90) ||
        (occupancyFilter === 'full' && percent >= 90 && percent <= 100) ||
        (occupancyFilter === 'overflow' && percent > 100);
      return matchesSearch && matchesOccupancy;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ru');
      }
      if (sortBy === 'students_desc') {
        return Number(b.studentCount || 0) - Number(a.studentCount || 0);
      }
      if (sortBy === 'occupancy_asc') {
        return occupancyPercent(a) - occupancyPercent(b);
      }
      return occupancyPercent(b) - occupancyPercent(a);
    });
  }, [groups, search, occupancyFilter, sortBy]);

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
      teacherId: group.teacherId || '',
      teacherName: group.teacherName || '',
      schedule: typeof group.schedule === 'string' ? group.schedule : '',
      time: String((group as any).time || ''),
      color: group.color || '#133C2A',
      maxCapacity: String((group as any).maxCapacity || 12),
    });
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.ageRange.trim()) {
      toast.error('Заполните название и возрастной диапазон');
      return;
    }
    if (!validateTimeRange(form.time)) {
      toast.error('Время должно быть в формате 18:00-19:00');
      return;
    }
    const maxCapacity = Number(form.maxCapacity);
    if (!Number.isFinite(maxCapacity) || maxCapacity < 1 || maxCapacity > 200) {
      toast.error('Максимальная вместимость должна быть от 1 до 200');
      return;
    }
    const payload = {
      name: form.name.trim(),
      age_range: form.ageRange.trim(),
      teacher_id: form.teacherId || null,
      teacher_name:
        (form.teacherId
          ? teacherOptions.find((item) => item.id === form.teacherId)?.name
          : form.teacherName
        )?.trim() || null,
      schedule: form.schedule.trim(),
      time: form.time.trim(),
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
      const payload = {
        name: `${group.name} (копия)`,
        age_range: group.ageRange || '',
        teacher_id: group.teacherId || null,
        teacher_name: group.teacherName || null,
        schedule: typeof group.schedule === 'string' ? group.schedule : '',
        time: String((group as any).time || ''),
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

  const openSubstitutionDialog = (group: Group) => {
    setSubstitutionGroupId(group.id);
    setReplacementTeacherId('');
    setReplacementReason('');
    setReplacementStartsAt(new Date().toISOString().slice(0, 10));
    setReplacementEndsAt('');
    setReplacementMakeCurrent(false);
    setIsSubstitutionDialogOpen(true);
  };

  const openRosterDialog = (group: Group) => {
    setSelectedRosterGroupId(group.id);
    setIsRosterDialogOpen(true);
  };

  const applySubstitution = async () => {
    if (!substitutionGroup) {
      toast.error('Группа не найдена');
      return;
    }
    if (!replacementTeacherId) {
      toast.error('Выберите преподавателя замены');
      return;
    }
    if (!replacementReason.trim()) {
      toast.error('Укажите причину замены');
      return;
    }
    const replacementTeacher = teacherOptions.find((item) => item.id === replacementTeacherId);
    if (!replacementTeacher) {
      toast.error('Преподаватель замены не найден');
      return;
    }

    setIsApplyingReplacement(true);
    try {
      if (replacementMakeCurrent) {
        await updateOwnerGroup(substitutionGroup.id, {
          name: substitutionGroup.name,
          age_range: substitutionGroup.ageRange,
          teacher_id: replacementTeacher.id,
          teacher_name: replacementTeacher.name,
          schedule: substitutionGroup.schedule || '',
          time: String((substitutionGroup as any).time || ''),
          color: substitutionGroup.color || '#133C2A',
          max_capacity: Number((substitutionGroup as any).maxCapacity || 12),
        });
      }

      const nextReplacement: TeacherReplacement = {
        id: `repl-${Date.now()}`,
        groupId: substitutionGroup.id,
        groupName: substitutionGroup.name,
        previousTeacherId: substitutionGroup.teacherId || '',
        previousTeacherName: substitutionGroup.teacherName || 'Не назначен',
        replacementTeacherId: replacementTeacher.id,
        replacementTeacherName: replacementTeacher.name,
        reason: replacementReason.trim(),
        startsAt: replacementStartsAt,
        endsAt: replacementEndsAt || null,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      setReplacements((prev) => {
        const withClosed = prev.map((item) =>
          item.groupId === substitutionGroup.id && item.status === 'active'
            ? { ...item, status: 'completed' as const }
            : item,
        );
        const next = [nextReplacement, ...withClosed];
        saveStoredReplacements(next);
        return next;
      });

      toast.success(replacementMakeCurrent ? 'Замена применена и преподаватель обновлен' : 'Временная замена добавлена');
      setIsSubstitutionDialogOpen(false);
      await refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось применить замену');
    } finally {
      setIsApplyingReplacement(false);
    }
  };

  const completeReplacement = async (replacementId: string) => {
    setCompletingReplacementId(replacementId);
    try {
      setReplacements((prev) => {
        const next = prev.map((item) =>
          item.id === replacementId ? { ...item, status: 'completed' as const } : item,
        );
        saveStoredReplacements(next);
        return next;
      });
      toast.success('Замена завершена');
    } finally {
      setCompletingReplacementId(null);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Группы</h1>
          <p className="text-[#133C2A]/60">Реестр групп студии</p>
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

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden border-none bg-[#123827] text-white shadow-[0_22px_55px_rgba(19,60,42,0.16)]">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-white/60">Состояние групп</p>
                <p className="mt-2 text-4xl leading-none md:text-5xl">{averageUtilization}%</p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/68">
                  Средняя заполненность. Ниже сразу видно, где нужен набор, где группа почти полная, а где нет преподавателя.
                </p>
              </div>
              <Button className="rounded-2xl bg-white text-[#133C2A] hover:bg-white/90" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Создать группу
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <button type="button" onClick={() => setOccupancyFilter('all')} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left">
                <span className="block text-xs text-white/50">Групп</span>
                <span className="mt-1 block text-2xl">{totals.groups}</span>
              </button>
              <button type="button" onClick={() => setSortBy('students_desc')} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left">
                <span className="block text-xs text-white/50">Учеников</span>
                <span className="mt-1 block text-2xl">{totals.students}/{totals.capacity}</span>
              </button>
              <button type="button" onClick={() => setOccupancyFilter('full')} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left">
                <span className="block text-xs text-white/50">Почти полные</span>
                <span className="mt-1 block text-2xl">{totals.highLoad}</span>
              </button>
              <button type="button" onClick={() => setOccupancyFilter('all')} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-left">
                <span className="block text-xs text-white/50">Без преподавателя</span>
                <span className="mt-1 block text-2xl text-red-200">{totals.withoutTeacher}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/92 shadow-[0_12px_35px_rgba(19,60,42,0.07)]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg text-[#133C2A]">Замены</p>
                <p className="text-sm text-[#133C2A]/58">Активные подмены преподавателей.</p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {totals.substitutionsActive}
              </Badge>
            </div>
            <div className="mt-4 space-y-2">
              {recentReplacements.length === 0 ? (
                <div className="rounded-2xl bg-[#F8F4E3]/80 p-4 text-sm text-[#133C2A]/62">
                  Активных замен нет.
                </div>
              ) : (
                recentReplacements.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/70 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#133C2A]">{item.groupName}</p>
                        <p className="mt-1 text-xs text-[#133C2A]/58">
                          {item.previousTeacherName} → {item.replacementTeacherName}
                        </p>
                        <p className="mt-1 text-xs text-[#133C2A]/58">
                          {toDateValue(item.startsAt)}
                          {item.endsAt ? ` — ${toDateValue(item.endsAt)}` : ''}
                        </p>
                      </div>
                      {item.status === 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl bg-white"
                          onClick={() => void completeReplacement(item.id)}
                          disabled={completingReplacementId === item.id}
                        >
                          Завершить
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </section>

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
                placeholder="Поиск по группе, преподавателю, расписанию"
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
              Фильтры и сортировка
            </Button>
            <div className={`${isFiltersOpen ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-[1fr_220px_220px]`}>
              <div className="hidden md:block" />
              <Select value={occupancyFilter} onValueChange={(value: OccupancyFilter) => setOccupancyFilter(value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="needs_students">Нужен набор</SelectItem>
                  <SelectItem value="balanced">Сбалансированы</SelectItem>
                  <SelectItem value="full">Почти полные</SelectItem>
                  <SelectItem value="overflow">Переполнены</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="occupancy_desc">Сначала заполненные</SelectItem>
                  <SelectItem value="occupancy_asc">Сначала пустые</SelectItem>
                  <SelectItem value="students_desc">По числу учеников</SelectItem>
                  <SelectItem value="name">По названию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-[#133C2A]/60">Пока нет групп</p>
          ) : (
            filteredGroups.map((group) => {
              const maxCapacity = Number((group as any).maxCapacity || 12);
              const percent = occupancyPercent(group);
              const activeReplacement = activeReplacementByGroupId.get(group.id);
              return (
                <div
                  key={group.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openRosterDialog(group)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openRosterDialog(group);
                    }
                  }}
                  className="cursor-pointer rounded-2xl border border-[#133C2A]/10 p-3 transition-smooth hover:border-[#D4AF37]/35 hover:bg-[#FFF9E8]/45 md:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#133C2A]">{group.name}</p>
                        <Badge variant="outline" className={`rounded-xl ${occupancyBadgeClass(percent)}`}>
                          {occupancyLabel(percent)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[#133C2A]/60 mt-1">{group.ageRange}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openEdit(group); }} className="rounded-xl" title="Редактировать">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => { event.stopPropagation(); void duplicateGroup(group); }}
                        className="rounded-xl"
                        title="Дублировать"
                        disabled={duplicatingId === group.id}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => { event.stopPropagation(); openSubstitutionDialog(group); }}
                        className="rounded-xl"
                        title="Замена преподавателя"
                      >
                        <Shuffle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => { event.stopPropagation(); void remove(group.id); }}
                        className="rounded-xl"
                        title="Удалить"
                        disabled={deletingId === group.id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[#133C2A]/70 sm:flex sm:flex-wrap sm:gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {group.studentCount}/{maxCapacity}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {group.schedule || 'Расписание не задано'}
                    </span>
                    {group.teacherName ? (
                      <span>
                        {activeReplacement ? `${activeReplacement.replacementTeacherName} (замена)` : group.teacherName}
                      </span>
                    ) : null}
                  </div>
                  {activeReplacement && (
                    <div className="mt-2 rounded-xl border border-[#D4AF37]/30 bg-[#FFF9E8] px-3 py-2 text-xs text-[#8B6B00]">
                      Замена: {activeReplacement.previousTeacherName} → {activeReplacement.replacementTeacherName}
                      {' • '}
                      {toDateValue(activeReplacement.startsAt)}
                      {activeReplacement.endsAt ? ` — ${toDateValue(activeReplacement.endsAt)}` : ''}
                      {' • '}
                      {activeReplacement.reason}
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-[#133C2A]/60 mb-1">
                      <span>Заполненность</span>
                      <span>{percent}%</span>
                    </div>
                    <Progress value={percent} max={100} className="h-2 bg-[#133C2A]/10 [&>div]:bg-[#D4AF37]" />
                  </div>
                  <p className="mt-2 text-xs text-[#133C2A]/45">Нажмите на группу, чтобы открыть состав</p>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={isRosterDialogOpen} onOpenChange={setIsRosterDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Состав группы</DialogTitle>
          </DialogHeader>
          {rosterGroup ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[#133C2A]">{rosterGroup.name}</p>
                    <p className="mt-1 text-sm text-[#133C2A]/60">{rosterGroup.ageRange || 'Возраст не указан'}</p>
                    <p className="mt-1 text-sm text-[#133C2A]/60">
                      {rosterGroup.teacherName || 'Преподаватель не назначен'} · {rosterGroup.schedule || 'расписание не задано'}
                    </p>
                  </div>
                  <Badge variant="outline" className={`rounded-full ${occupancyBadgeClass(occupancyPercent(rosterGroup))}`}>
                    {rosterChildren.length}/{Number((rosterGroup as any).maxCapacity || 12)}
                  </Badge>
                </div>
                <Progress value={occupancyPercent(rosterGroup)} max={100} className="mt-3 h-2 bg-[#133C2A]/10 [&>div]:bg-[#D4AF37]" />
              </div>

              <div className="space-y-2">
                {rosterChildren.length === 0 ? (
                  <div className="rounded-2xl border border-[#133C2A]/10 bg-white p-4 text-sm text-[#133C2A]/60">
                    В группе пока нет учеников.
                  </div>
                ) : (
                  rosterChildren.map((child) => (
                    <div key={child.id} className="rounded-2xl border border-[#133C2A]/10 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[#133C2A]">{child.fullName || 'Ученик'}</p>
                          <p className="mt-1 text-xs text-[#133C2A]/58">
                            {child.age ? `${child.age} лет` : 'возраст не указан'} · {child.parentName || 'родитель не указан'}
                          </p>
                          {child.parentPhone ? (
                            <p className="mt-1 text-xs text-[#133C2A]/58">{child.parentPhone}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge variant="outline" className="rounded-full">
                            {child.remainingClasses ?? 0}/{child.totalClasses ?? 0}
                          </Badge>
                          <p className="mt-1 text-[11px] text-[#133C2A]/45">занятий</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isSubstitutionDialogOpen} onOpenChange={setIsSubstitutionDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">Замена преподавателя</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-[#133C2A]/10 px-3 py-2 text-sm text-[#133C2A]/80">
              Группа: {substitutionGroup?.name || '—'}
              <div className="text-xs text-[#133C2A]/60 mt-1">
                Текущий преподаватель: {substitutionGroup?.teacherName || 'Не назначен'}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Преподаватель на замену</Label>
              <Select value={replacementTeacherId} onValueChange={setReplacementTeacherId}>
                <SelectTrigger><SelectValue placeholder="Выберите преподавателя" /></SelectTrigger>
                <SelectContent>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Причина</Label>
              <Input
                value={replacementReason}
                onChange={(e) => setReplacementReason(e.target.value)}
                placeholder="Отпуск, болезнь, участие в мероприятии..."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Начало замены</Label>
                <Input type="date" value={replacementStartsAt} onChange={(e) => setReplacementStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Окончание (опционально)</Label>
                <Input type="date" value={replacementEndsAt} onChange={(e) => setReplacementEndsAt(e.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-[#133C2A]/10 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[#133C2A]">Обновить преподавателя группы</p>
                <p className="text-sm text-[#133C2A]/60">Если включено, замена сразу становится текущим преподавателем группы</p>
              </div>
              <Switch checked={replacementMakeCurrent} onCheckedChange={setReplacementMakeCurrent} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubstitutionDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button
              onClick={() => void applySubstitution()}
              className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
              disabled={isApplyingReplacement}
            >
              {isApplyingReplacement ? 'Применяем...' : 'Применить замену'}
            </Button>
          </DialogFooter>
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
              <Label>Преподаватель</Label>
              <Select
                value={form.teacherId || 'manual'}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    teacherId: value === 'manual' ? '' : value,
                    teacherName: value === 'manual' ? prev.teacherName : '',
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Ввести вручную</SelectItem>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Имя преподавателя (вручную)</Label>
              <Input
                value={form.teacherName}
                onChange={(e) => setForm((prev) => ({ ...prev, teacherName: e.target.value }))}
                disabled={Boolean(form.teacherId)}
                placeholder={form.teacherId ? 'Выбран преподаватель из списка' : 'Введите имя'}
              />
            </div>
            <div className="space-y-1">
              <Label>Расписание</Label>
              <Input value={form.schedule} onChange={(e) => setForm((prev) => ({ ...prev, schedule: e.target.value }))} placeholder="ПН, СР, ПТ" />
            </div>
            <div className="space-y-1">
              <Label>Время</Label>
              <Input value={form.time} onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))} placeholder="18:00-19:00" />
            </div>
            <div className="space-y-1">
              <Label>Макс. мест</Label>
              <Input type="number" value={form.maxCapacity} onChange={(e) => setForm((prev) => ({ ...prev, maxCapacity: e.target.value }))} />
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
