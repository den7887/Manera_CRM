import { useEffect, useMemo, useState } from 'react';
import { Calendar, Edit, Plus, Trash2, Users } from 'lucide-react';
import { Group } from '../../types';
import { createOwnerGroup, deleteOwnerGroup, loadOwnerGroups, updateOwnerGroup } from '../../lib/backendApi';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const initialForm = {
  name: '',
  ageRange: '',
  teacherName: '',
  schedule: '',
  time: '',
  color: '#133C2A',
  maxCapacity: '12',
};

export function OwnerGroupsPanel() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const list = await loadOwnerGroups();
      setGroups(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить группы');
    } finally {
      setIsLoading(false);
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
    }),
    [groups],
  );

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
    const payload = {
      name: form.name.trim(),
      age_range: form.ageRange.trim(),
      teacher_name: form.teacherName.trim() || null,
      schedule: form.schedule.trim(),
      time: form.time.trim(),
      color: form.color,
      max_capacity: Number(form.maxCapacity) || 12,
    };
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
    }
  };

  const remove = async (groupId: string) => {
    if (!window.confirm('Удалить группу?')) {
      return;
    }
    try {
      await deleteOwnerGroup(groupId);
      setGroups((prev) => prev.filter((group) => group.id !== groupId));
      toast.success('Группа удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить группу');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Группы</h1>
          <p className="text-[#133C2A]/60">Реестр групп студии</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
          <Plus className="w-4 h-4 mr-2" />
          Создать группу
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-[#133C2A]/60">Групп</p>
            <p className="text-3xl text-[#133C2A]">{totals.groups}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-[#133C2A]/60">Учеников</p>
            <p className="text-3xl text-[#133C2A]">{totals.students}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-[#133C2A]/60">Вместимость</p>
            <p className="text-3xl text-[#133C2A]">{totals.capacity}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Список групп</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : groups.length === 0 ? (
            <p className="text-[#133C2A]/60">Пока нет групп</p>
          ) : (
            groups.map((group) => {
              const maxCapacity = Number((group as any).maxCapacity || 12);
              return (
                <div key={group.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[#133C2A]">{group.name}</p>
                      <p className="text-sm text-[#133C2A]/60">{group.ageRange}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(group)} className="rounded-xl">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => remove(group.id)} className="rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#133C2A]/70">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {group.studentCount}/{maxCapacity}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {group.schedule || 'Расписание не задано'}
                    </span>
                    {group.teacherName ? <span>{group.teacherName}</span> : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{editingGroupId ? 'Редактировать группу' : 'Новая группа'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
              <Input value={form.teacherName} onChange={(e) => setForm((prev) => ({ ...prev, teacherName: e.target.value }))} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">
              Отмена
            </Button>
            <Button onClick={() => void save()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
