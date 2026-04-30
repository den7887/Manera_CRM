import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Plus, Trash2, Users } from 'lucide-react';
import { Employee } from '../../types';
import {
  createOwnerEmployee,
  deleteOwnerEmployee,
  loadOwnerEmployees,
  updateOwnerEmployee,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const defaultForm = {
  id: '',
  name: '',
  role: 'teacher' as 'teacher' | 'admin',
  phone: '',
  email: '',
  status: 'active' as 'active' | 'inactive',
};

export function OwnerTeamPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const refresh = async () => {
    setIsLoading(true);
    try {
      setEmployees(await loadOwnerEmployees());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить сотрудников');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const totals = useMemo(
    () => ({
      all: employees.length,
      teachers: employees.filter((item) => item.role === 'teacher').length,
      admins: employees.filter((item) => item.role === 'admin').length,
    }),
    [employees],
  );

  const openCreate = () => {
    setForm(defaultForm);
    setIsDialogOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setForm({
      id: employee.id,
      name: employee.name,
      role: (employee.role === 'admin' ? 'admin' : 'teacher') as 'teacher' | 'admin',
      phone: employee.phone,
      email: employee.email || '',
      status: employee.status === 'inactive' ? 'inactive' : 'active',
    });
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Заполните имя и телефон');
      return;
    }
    const payload = {
      name: form.name.trim(),
      role: form.role,
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: form.status,
      permissions: [],
    };
    try {
      if (form.id) {
        await updateOwnerEmployee(form.id, payload);
        toast.success('Сотрудник обновлен');
      } else {
        await createOwnerEmployee(payload);
        toast.success('Сотрудник добавлен');
      }
      setIsDialogOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить сотрудника');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Команда</h1>
          <p className="text-[#133C2A]/60">Преподаватели и администраторы</p>
        </div>
        <Button onClick={openCreate} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить сотрудника
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-[#133C2A]/60">Всего</p>
            <p className="text-3xl text-[#133C2A]">{totals.all}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-[#133C2A]/60">Преподаватели</p>
            <p className="text-3xl text-[#133C2A]">{totals.teachers}</p>
          </CardContent>
        </Card>
        <Card className="border-none soft-shadow">
          <CardContent className="p-5">
            <p className="text-sm text-[#133C2A]/60">Администраторы</p>
            <p className="text-3xl text-[#133C2A]">{totals.admins}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A]">Сотрудники</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : employees.length === 0 ? (
            <p className="text-[#133C2A]/60">Список сотрудников пуст</p>
          ) : (
            employees.map((employee) => (
              <div key={employee.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[#133C2A]">{employee.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-xl">
                        {employee.role === 'teacher' ? 'Преподаватель' : 'Администратор'}
                      </Badge>
                      <Badge variant="outline" className="rounded-xl">
                        {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                      </Badge>
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
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(employee)} className="rounded-xl">
                      Изменить
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(employee.id)} className="rounded-xl">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#133C2A]">{form.id ? 'Редактирование сотрудника' : 'Новый сотрудник'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
              <Select value={form.role} onValueChange={(value: 'teacher' | 'admin') => setForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Преподаватель</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Статус</Label>
              <Select value={form.status} onValueChange={(value: 'active' | 'inactive') => setForm((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активен</SelectItem>
                  <SelectItem value="inactive">Неактивен</SelectItem>
                </SelectContent>
              </Select>
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
