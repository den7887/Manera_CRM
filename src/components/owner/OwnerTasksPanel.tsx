import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Calendar, CheckSquare, MessageSquare, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, UserRound } from 'lucide-react';
import { Employee, Task, TaskPriority, TaskType } from '../../types';
import { createTask, deleteTask, loadOwnerEmployees, loadTasks, updateTask } from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

const newTaskDefaults = {
  title: '',
  description: '',
  type: 'general' as TaskType,
  priority: 'medium' as TaskPriority,
  dueDate: '',
  assigneeId: '',
};

type TaskStatusFilter = 'all' | 'todo' | 'done' | 'overdue';
type TaskSort = 'created_desc' | 'due_asc' | 'priority_desc';

function isTaskOverdue(task: Task): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

function formatDate(value?: Date): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function priorityWeight(priority: TaskPriority): number {
  if (priority === 'urgent') return 4;
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function priorityLabel(priority: TaskPriority): string {
  if (priority === 'urgent') return 'Срочный';
  if (priority === 'high') return 'Высокий';
  if (priority === 'medium') return 'Средний';
  return 'Низкий';
}

function typeLabel(type: TaskType): string {
  if (type === 'payment') return 'Оплаты';
  if (type === 'student') return 'Ученики';
  if (type === 'schedule') return 'Расписание';
  if (type === 'communication') return 'Коммуникации';
  if (type === 'system') return 'Система';
  return 'Общее';
}

export function OwnerTasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(newTaskDefaults);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<TaskSort>('created_desc');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'stats'>('tasks');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [loadedTasks, loadedEmployees] = await Promise.all([
        loadTasks(),
        loadOwnerEmployees(),
      ]);
      setTasks(loadedTasks);
      setEmployees(loadedEmployees.filter((employee) => employee.status === 'active'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить задачи');
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

  const assigneeById = useMemo(() => {
    const rows = new Map<string, string>();
    employees.forEach((employee) => rows.set(employee.id, employee.name));
    rows.set('owner', 'Владелец');
    return rows;
  }, [employees]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        (task.description || '').toLowerCase().includes(query) ||
        String((task as any).assigneeComment || '').toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'todo' && task.status === 'todo') ||
        (statusFilter === 'done' && task.status === 'done') ||
        (statusFilter === 'overdue' && isTaskOverdue(task));
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === 'all' || String(task.assigneeId || '') === assigneeFilter;
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'priority_desc') {
        return priorityWeight(b.priority) - priorityWeight(a.priority);
      }
      if (sortBy === 'due_asc') {
        const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDue - bDue;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  const stats = useMemo(() => {
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const todo = tasks.filter((task) => task.status === 'todo').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const assigneeStats = Array.from(assigneeById.entries()).map(([id, name]) => {
      const own = tasks.filter((task) => String(task.assigneeId || '') === id);
      return {
        id,
        name,
        total: own.length,
        done: own.filter((task) => task.status === 'done').length,
        overdue: own.filter((task) => isTaskOverdue(task)).length,
      };
    }).filter((row) => row.total > 0);
    return { total, done, todo, overdue, completionRate, assigneeStats };
  }, [tasks, assigneeById]);

  const focusTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'done')
        .sort((a, b) => {
          const overdueDiff = Number(isTaskOverdue(b)) - Number(isTaskOverdue(a));
          if (overdueDiff !== 0) return overdueDiff;
          const priorityDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
          if (priorityDiff !== 0) return priorityDiff;
          const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return aDue - bDue;
        })
        .slice(0, 3),
    [tasks],
  );

  const taskTemplates = [
    {
      title: 'Напомнить об оплате',
      description: 'Проверить долг клиента и отправить напоминание родителю.',
      type: 'payment' as TaskType,
      priority: 'high' as TaskPriority,
    },
    {
      title: 'Распределить ученика в группу',
      description: 'Открыть карточку ребенка, подобрать группу и назначить расписание.',
      type: 'student' as TaskType,
      priority: 'medium' as TaskPriority,
    },
    {
      title: 'Ответить родителю',
      description: 'Проверить чат, дать ответ и зафиксировать итог общения.',
      type: 'communication' as TaskType,
      priority: 'medium' as TaskPriority,
    },
  ];

  const createTaskHandler = async () => {
    if (!draft.title.trim()) {
      toast.error('Введите название задачи');
      return;
    }
    const assigneeName = assigneeById.get(draft.assigneeId || 'owner') || 'Владелец';
    setIsSaving(true);
    try {
      const created = await createTask({
        id: `task-${Date.now()}`,
        title: draft.title.trim(),
        description: draft.description.trim(),
        type: draft.type,
        priority: draft.priority,
        status: 'todo',
        assigneeId: draft.assigneeId || 'owner',
        assigneeName,
        createdBy: 'owner',
        createdByName: 'Владелец',
        createdAt: new Date(),
        dueDate: draft.dueDate ? new Date(draft.dueDate) : undefined,
        isAutoGenerated: false,
        notes: '',
      });
      setTasks((prev) => [created, ...prev]);
      setDraft(newTaskDefaults);
      setIsCreateDialogOpen(false);
      toast.success('Задача создана');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать задачу');
    } finally {
      setIsSaving(false);
    }
  };

  const updateTaskPatch = async (task: Task, patch: Partial<Task>) => {
    try {
      const updated = await updateTask(task.id, patch);
      setTasks((prev) => prev.map((row) => (row.id === task.id ? updated : row)));
      if (selectedTask?.id === task.id) {
        setSelectedTask(updated);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить задачу');
    }
  };

  const remove = async (taskId: string) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      if (selectedTask?.id === taskId) {
        setIsTaskDialogOpen(false);
        setSelectedTask(null);
      }
      toast.success('Задача удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить задачу');
    }
  };

  const openTaskDialog = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#133C2A] mb-2">Задачи</h1>
          <p className="text-[#133C2A]/60">Назначение задач сотрудникам и контроль исполнения</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
            <Plus className="w-4 h-4 mr-2" />
            Новая задача
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tasks' | 'stats')} className="space-y-4">
        <TabsList className="rounded-2xl bg-[#F8F4E3] w-full sm:w-auto">
          <TabsTrigger value="tasks" className="rounded-xl">Список</TabsTrigger>
          <TabsTrigger value="stats" className="rounded-xl">Статистика</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <Card className="overflow-hidden border-none bg-white/92 shadow-[0_12px_35px_rgba(19,60,42,0.07)]">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg text-[#133C2A]">Рабочая доска</p>
                    <p className="text-sm text-[#133C2A]/58">Сначала видны только задачи, которые реально требуют действия.</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 rounded-2xl bg-[#F8F4E3]/80 p-2 text-center">
                    <button type="button" onClick={() => setStatusFilter('all')} className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-lg text-[#133C2A]">{stats.total}</span>
                      <span className="text-[11px] text-[#133C2A]/55">всего</span>
                    </button>
                    <button type="button" onClick={() => setStatusFilter('todo')} className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-lg text-[#133C2A]">{stats.todo}</span>
                      <span className="text-[11px] text-[#133C2A]/55">в работе</span>
                    </button>
                    <button type="button" onClick={() => setStatusFilter('overdue')} className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-lg text-[#D14343]">{stats.overdue}</span>
                      <span className="text-[11px] text-[#133C2A]/55">проср.</span>
                    </button>
                    <button type="button" onClick={() => setActiveTab('stats')} className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-lg text-[#133C2A]">{stats.completionRate}%</span>
                      <span className="text-[11px] text-[#133C2A]/55">готово</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {focusTasks.length === 0 ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                      <p className="text-[#133C2A]">Срочных задач нет</p>
                      <p className="mt-1 text-sm text-[#133C2A]/62">Можно создать поручение или планово проверить статистику.</p>
                    </div>
                  ) : (
                    focusTasks.map((task, index) => {
                      const overdue = isTaskOverdue(task);
                      return (
                        <div
                          key={task.id}
                          className={`rounded-2xl border p-4 ${
                            overdue ? 'border-red-200 bg-red-50' : index === 0 ? 'border-[#D4AF37]/35 bg-[#FFF9E8]' : 'border-[#133C2A]/10 bg-white'
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className={`rounded-full ${overdue ? 'border-red-200 text-red-700' : 'border-[#D4AF37]/35 text-[#B8941F]'}`}>
                                  {overdue ? 'просрочено' : index === 0 ? 'первым делом' : priorityLabel(task.priority)}
                                </Badge>
                                <Badge variant="outline" className="rounded-full border-[#133C2A]/10 text-[#133C2A]/62">
                                  {typeLabel(task.type)}
                                </Badge>
                              </div>
                              <p className="mt-2 text-[#133C2A]">{task.title}</p>
                              <p className="mt-1 text-xs text-[#133C2A]/62">
                                {assigneeById.get(task.assigneeId || '') || task.assigneeName || '—'} · дедлайн: {formatDate(task.dueDate)}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                              <Button size="sm" variant="outline" className="rounded-xl bg-white" onClick={() => openTaskDialog(task)}>
                                Детали
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-xl bg-[#133C2A] text-white hover:bg-[#133C2A]/90"
                                onClick={() =>
                                  void updateTaskPatch(task, {
                                    status: 'done',
                                    completedAt: new Date(),
                                  })
                                }
                              >
                                Готово
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none bg-[#fbf7e8] shadow-[0_12px_35px_rgba(19,60,42,0.07)]">
              <CardContent className="p-5">
                <p className="text-lg text-[#133C2A]">Быстро создать</p>
                <div className="mt-4 space-y-2">
                  {taskTemplates.map((template) => (
                    <button
                      key={template.title}
                      type="button"
                      className="w-full rounded-2xl bg-white p-3 text-left transition-smooth hover:bg-[#FFF9E8]"
                      onClick={() => {
                        setDraft((prev) => ({
                          ...prev,
                          title: template.title,
                          description: template.description,
                          type: template.type,
                          priority: template.priority,
                        }));
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <span className="block text-sm text-[#133C2A]">{template.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#133C2A]/58">{template.description}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <Card className="border-none soft-shadow">
            <CardHeader className="pb-3"><CardTitle className="text-[#133C2A]">Список задач</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:hidden">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по задачам" className="pl-9 rounded-xl" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl justify-center"
                  onClick={() => setIsFiltersOpen((prev) => !prev)}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  {isFiltersOpen ? 'Скрыть фильтры' : 'Фильтры'}
                </Button>
              </div>

              <div className={`${isFiltersOpen ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-[1fr_180px_180px_180px_200px]`}>
                <div className="relative hidden md:block">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по задачам" className="pl-9 rounded-xl" />
                </div>
                <Select value={statusFilter} onValueChange={(value: TaskStatusFilter) => setStatusFilter(value)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="todo">В работе</SelectItem>
                    <SelectItem value="done">Выполнено</SelectItem>
                    <SelectItem value="overdue">Просрочено</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(value: 'all' | TaskPriority) => setPriorityFilter(value)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все приоритеты</SelectItem>
                    <SelectItem value="urgent">Срочный</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={assigneeFilter} onValueChange={(value: 'all' | string) => setAssigneeFilter(value)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все исполнители</SelectItem>
                    <SelectItem value="owner">Владелец</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value: TaskSort) => setSortBy(value)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_desc">Сначала новые</SelectItem>
                    <SelectItem value="due_asc">Ближайший дедлайн</SelectItem>
                    <SelectItem value="priority_desc">Сначала срочные</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <p className="text-[#133C2A]/60">Загрузка...</p>
              ) : filteredTasks.length === 0 ? (
                <p className="text-[#133C2A]/60">Задач по текущему фильтру нет</p>
              ) : (
                filteredTasks.map((task) => {
                  const overdue = isTaskOverdue(task);
                  return (
                    <div key={task.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2 min-w-0">
                          <p className="text-[#133C2A]">{task.title}</p>
                          <p className="text-sm text-[#133C2A]/70">{task.description || 'Без описания'}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="rounded-xl">{typeLabel(task.type)}</Badge>
                            <Badge variant="outline" className="rounded-xl">{priorityLabel(task.priority)}</Badge>
                            <Badge variant="outline" className="rounded-xl">{task.status === 'done' ? 'Выполнено' : 'В работе'}</Badge>
                            {overdue && (
                              <Badge className="rounded-xl bg-red-50 text-red-700 border border-red-200">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Просрочено
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-[#133C2A]/60">
                            <span className="flex items-center gap-1"><UserRound className="w-3.5 h-3.5" />Исполнитель: {assigneeById.get(task.assigneeId || '') || task.assigneeName || '—'}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Дедлайн: {formatDate(task.dueDate)}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Создано: {formatDate(task.createdAt)}</span>
                          </div>
                          {(task as any).assigneeComment ? (
                            <div className="text-xs text-[#133C2A]/70 rounded-xl bg-[#F8F4E3]/70 px-2 py-1 inline-flex items-start gap-1 max-w-full">
                              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">Комментарий исполнителя: {(task as any).assigneeComment}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void updateTaskPatch(task, {
                                status: task.status === 'done' ? 'todo' : 'done',
                                completedAt: task.status === 'done' ? undefined : new Date(),
                              })
                            }
                            className="rounded-xl"
                            title="Сменить статус"
                          >
                            <CheckSquare className="w-4 h-4" />
                            <span className="sm:hidden">{task.status === 'done' ? 'Вернуть' : 'Готово'}</span>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openTaskDialog(task)} className="rounded-xl">
                            Детали
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void remove(task.id)} className="rounded-xl" title="Удалить">
                            <Trash2 className="w-4 h-4" />
                            <span className="sm:hidden">Удалить</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Процент выполнения</p><p className="text-3xl text-[#133C2A]">{stats.completionRate}%</p></CardContent></Card>
            <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Невыполненных</p><p className="text-3xl text-[#133C2A]">{stats.todo}</p></CardContent></Card>
            <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Просроченных</p><p className="text-3xl text-[#D14343]">{stats.overdue}</p></CardContent></Card>
            <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Всего задач</p><p className="text-3xl text-[#133C2A]">{stats.total}</p></CardContent></Card>
          </div>

          <Card className="border-none soft-shadow">
            <CardHeader><CardTitle className="text-[#133C2A]">Нагрузка по исполнителям</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stats.assigneeStats.length === 0 ? (
                <p className="text-[#133C2A]/60">Пока нет данных по исполнителям</p>
              ) : (
                stats.assigneeStats.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-[#133C2A]/10 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[#133C2A]">{row.name}</p>
                      <p className="text-xs text-[#133C2A]/60">Всего: {row.total}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="rounded-xl">Выполнено: {row.done}</Badge>
                      <Badge variant="outline" className="rounded-xl">Просрочено: {row.overdue}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="text-[#133C2A]">Новая задача</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#133C2A]/10 bg-[#F8F4E3]/70 p-3">
              <p className="text-sm text-[#133C2A]">Быстрый шаблон</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {taskTemplates.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    className="rounded-xl border border-[#133C2A]/10 bg-white px-3 py-2 text-left text-sm text-[#133C2A] transition-smooth hover:border-[#D4AF37]/40 hover:bg-[#FFF9E8]"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        title: template.title,
                        description: template.description,
                        type: template.type,
                        priority: template.priority,
                      }))
                    }
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Название</Label>
              <Input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Описание</Label>
              <Textarea value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Исполнитель</Label>
                <Select value={draft.assigneeId || 'owner'} onValueChange={(value) => setDraft((prev) => ({ ...prev, assigneeId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Владелец</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Тип</Label>
                <Select value={draft.type} onValueChange={(value: TaskType) => setDraft((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Общая</SelectItem>
                    <SelectItem value="payment">Оплата</SelectItem>
                    <SelectItem value="student">Ученик</SelectItem>
                    <SelectItem value="schedule">Расписание</SelectItem>
                    <SelectItem value="communication">Коммуникация</SelectItem>
                    <SelectItem value="system">Система</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Приоритет</Label>
                <Select value={draft.priority} onValueChange={(value: TaskPriority) => setDraft((prev) => ({ ...prev, priority: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="urgent">Срочный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Дедлайн</Label>
                <Input type="date" value={draft.dueDate} onChange={(e) => setDraft((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-2xl">Отмена</Button>
            <Button onClick={() => void createTaskHandler()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" disabled={isSaving}>
              {isSaving ? 'Создаем...' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="rounded-3xl max-w-2xl">
          {selectedTask ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#133C2A]">{selectedTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Исполнитель</Label>
                    <Select
                      value={selectedTask.assigneeId || 'owner'}
                      onValueChange={(value) => {
                        const patch: Partial<Task> = {
                          assigneeId: value,
                          assigneeName: assigneeById.get(value) || 'Владелец',
                        };
                        setSelectedTask((prev) => (prev ? { ...prev, ...patch } : prev));
                        void updateTaskPatch(selectedTask, patch);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Владелец</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>{employee.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Статус</Label>
                    <Select
                      value={selectedTask.status}
                      onValueChange={(value: 'todo' | 'done') => {
                        const patch: Partial<Task> = {
                          status: value,
                          completedAt: value === 'done' ? new Date() : undefined,
                        };
                        setSelectedTask((prev) => (prev ? { ...prev, ...patch } : prev));
                        void updateTaskPatch(selectedTask, patch);
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">В работе</SelectItem>
                        <SelectItem value="done">Выполнено</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Комментарий исполнителя</Label>
                  <Textarea
                    value={String((selectedTask as any).assigneeComment || '')}
                    onChange={(e) =>
                      setSelectedTask((prev) =>
                        prev
                          ? ({
                              ...prev,
                              assigneeComment: e.target.value,
                            } as Task)
                          : prev,
                      )
                    }
                    className="min-h-[90px]"
                    placeholder="Факт выполнения, причина переноса, блокеры"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() =>
                    void updateTaskPatch(selectedTask, {
                      assigneeComment: (selectedTask as any).assigneeComment || '',
                    } as Partial<Task>)
                  }
                >
                  Сохранить комментарий
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
