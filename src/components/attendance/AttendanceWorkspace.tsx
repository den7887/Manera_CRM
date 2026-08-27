import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight, ClipboardCheck, MoreVertical, Phone, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AttendanceDayGroupDto,
  AttendanceGroupRosterDto,
  loadAttendanceDay,
  loadAttendanceGroupRoster,
  markAttendance,
} from '../../lib/backendApi';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function addDaysIso(dateStr: string, delta: number): string {
  const base = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) return todayIso();
  base.setDate(base.getDate() + delta);
  const offset = base.getTimezoneOffset();
  return new Date(base.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

const badgeDotClass: Record<string, string> = {
  green: 'bg-[#1C8C64]',
  yellow: 'bg-[#D4AF37]',
  red: 'bg-[#D14343]',
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || '?').toUpperCase();
}

export interface AttendanceOpenClientInfo {
  clientId: string;
  fullName: string;
  parentPhone: string | null;
}

interface AttendanceWorkspaceProps {
  onOpenClient?: (info: AttendanceOpenClientInfo) => void;
}

export function AttendanceWorkspace({ onOpenClient }: AttendanceWorkspaceProps) {
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [groups, setGroups] = useState<AttendanceDayGroupDto[]>([]);
  const [isLoadingDay, setIsLoadingDay] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [roster, setRoster] = useState<AttendanceGroupRosterDto | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [pendingChildId, setPendingChildId] = useState<string | null>(null);

  const refreshDay = async () => {
    setIsLoadingDay(true);
    try {
      setGroups(await loadAttendanceDay(selectedDate));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить занятия на этот день');
      setGroups([]);
    } finally {
      setIsLoadingDay(false);
    }
  };

  useEffect(() => {
    void refreshDay();
    setSelectedGroupId(null);
    setRoster(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const openGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsLoadingRoster(true);
    try {
      setRoster(await loadAttendanceGroupRoster(groupId, selectedDate));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить список учеников');
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const handleMark = async (childId: string, nextStatus: 'present' | 'absent' | 'unmarked') => {
    if (!selectedGroupId) return;
    const wasMarked = roster?.students.find((s) => s.childId === childId)?.status != null;
    setPendingChildId(childId);
    try {
      const result = await markAttendance({ group_id: selectedGroupId, child_id: childId, date: selectedDate, status: nextStatus });
      setRoster((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map((student) =>
            student.childId === childId
              ? {
                  ...student,
                  status: result.status,
                  remainingClasses: result.remainingClasses,
                  attendanceStatusColor: result.attendanceStatusColor as 'green' | 'yellow' | 'red',
                  attendanceStatusLabel: result.attendanceStatusLabel,
                }
              : student,
          ),
        };
      });
      const nowMarked = result.status != null;
      if (wasMarked !== nowMarked) {
        const delta = nowMarked ? 1 : -1;
        setGroups((prev) =>
          prev.map((group) =>
            group.groupId === selectedGroupId ? { ...group, markedCount: group.markedCount + delta } : group,
          ),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отметить посещение');
    } finally {
      setPendingChildId(null);
    }
  };

  const totalMarked = useMemo(() => groups.reduce((sum, g) => sum + g.markedCount, 0), [groups]);
  const totalStudents = useMemo(() => groups.reduce((sum, g) => sum + g.studentCount, 0), [groups]);
  const fullyMarkedGroups = useMemo(
    () => groups.filter((g) => g.studentCount > 0 && g.markedCount >= g.studentCount).length,
    [groups],
  );

  const dateNav = (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-2xl border-[#133C2A]/15"
        onClick={() => setSelectedDate((prev) => addDaysIso(prev, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Input
        type="date"
        value={selectedDate}
        onChange={(event) => setSelectedDate(event.target.value || todayIso())}
        className="rounded-2xl"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 rounded-2xl border-[#133C2A]/15"
        onClick={() => setSelectedDate((prev) => addDaysIso(prev, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {selectedDate !== todayIso() ? (
        <Button
          type="button"
          variant="outline"
          className="hidden shrink-0 rounded-2xl border-[#133C2A]/15 sm:inline-flex"
          onClick={() => setSelectedDate(todayIso())}
        >
          Сегодня
        </Button>
      ) : null}
    </div>
  );

  if (selectedGroupId) {
    const groupColor = groups.find((g) => g.groupId === selectedGroupId)?.color || '#133C2A';
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="border-none soft-shadow">
          <CardHeader className="border-b border-[#133C2A]/10 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => { setSelectedGroupId(null); setRoster(null); }}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: groupColor }}
              >
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[#133C2A] truncate">{roster?.groupName || 'Группа'}</p>
                <p className="text-xs text-[#133C2A]/60 truncate">{formatDateLabel(selectedDate)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-3 md:p-4">
            {isLoadingRoster ? (
              <p className="text-sm text-[#133C2A]/60 py-6 text-center">Загрузка...</p>
            ) : !roster || roster.students.length === 0 ? (
              <p className="text-sm text-[#133C2A]/60 py-6 text-center">В этой группе пока нет учеников.</p>
            ) : (
              roster.students.map((student) => {
                const isPending = pendingChildId === student.childId;
                return (
                  <div key={student.childId} className="flex items-center gap-3 rounded-2xl border border-[#133C2A]/10 bg-white p-3 transition hover:border-[#D4AF37]/30">
                    <div className="relative shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F4E3] text-sm text-[#133C2A]">
                        {initialsOf(student.fullName)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white ${badgeDotClass[student.attendanceStatusColor] || 'bg-[#133C2A]/20'}`}
                        title={student.attendanceStatusLabel}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[#133C2A] truncate">{student.fullName}</p>
                      <p className="text-xs text-[#133C2A]/55 truncate">{student.attendanceStatusLabel}</p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant={student.status === 'present' ? 'default' : 'outline'}
                      disabled={isPending}
                      className={`h-9 w-9 rounded-xl shrink-0 ${student.status === 'present' ? 'bg-[#1C8C64] hover:bg-[#1C8C64]/90' : 'border-[#133C2A]/15'}`}
                      onClick={() => handleMark(student.childId, student.status === 'present' ? 'unmarked' : 'present')}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant={student.status === 'absent' ? 'default' : 'outline'}
                      disabled={isPending}
                      className={`h-9 w-9 rounded-xl shrink-0 ${student.status === 'absent' ? 'bg-[#D14343] hover:bg-[#D14343]/90' : 'border-[#133C2A]/15'}`}
                      onClick={() => handleMark(student.childId, student.status === 'absent' ? 'unmarked' : 'absent')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!student.clientId || !onOpenClient}
                          onClick={() =>
                            student.clientId &&
                            onOpenClient?.({
                              clientId: student.clientId,
                              fullName: student.fullName,
                              parentPhone: student.parentPhone,
                            })
                          }
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Открыть карточку
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!student.parentPhone}
                          onClick={() => {
                            if (student.parentPhone) window.location.href = `tel:${student.parentPhone}`;
                          }}
                        >
                          <Phone className="mr-2 h-4 w-4" />
                          Позвонить родителю
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A]">Посещаемость</h1>
          <p className="mt-1 text-sm text-[#133C2A]/60">Группы на выбранный день, отметки и остаток занятий.</p>
        </div>
        {dateNav}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#133C2A]">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl leading-none text-[#133C2A]">{groups.length}</p>
              <p className="mt-1.5 text-xs text-[#133C2A]/58">Групп на {formatDateLabel(selectedDate)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F8F4E3] text-[#8B6B00]">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl leading-none text-[#133C2A]">{totalMarked}/{totalStudents}</p>
              <p className="mt-1.5 text-xs text-[#133C2A]/58">Учеников отмечено</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white/92 shadow-[0_10px_24px_rgba(19,60,42,0.06)]">
          <CardContent className="flex items-center gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EEF5F0] text-[#1C8C64]">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl leading-none text-[#133C2A]">{fullyMarkedGroups}/{groups.length}</p>
              <p className="mt-1.5 text-xs text-[#133C2A]/58">Групп полностью отмечено</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader className="border-b border-[#133C2A]/10 py-3">
          <CardTitle className="text-[#133C2A] flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            Группы на {formatDateLabel(selectedDate)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-3 md:p-4">
          {isLoadingDay ? (
            <p className="text-sm text-[#133C2A]/60 py-6 text-center">Загрузка...</p>
          ) : groups.length === 0 ? (
            <p className="text-sm text-[#133C2A]/60 py-6 text-center">На {formatDateLabel(selectedDate)} занятий не запланировано.</p>
          ) : (
            groups.map((group) => {
              const isFull = group.studentCount > 0 && group.markedCount >= group.studentCount;
              return (
                <button
                  key={group.groupId}
                  onClick={() => void openGroup(group.groupId)}
                  className="w-full text-left rounded-2xl border border-[#133C2A]/10 hover:border-[#D4AF37]/35 hover:bg-[#133C2A]/[0.03] p-3 transition flex items-center gap-3"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: group.color || '#133C2A' }}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[#133C2A] truncate">{group.groupName}</p>
                    <p className="text-xs text-[#133C2A]/60 truncate">
                      {group.time ? `${group.time} · ` : ''}{group.teacherName || 'Педагог не назначен'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm ${isFull ? 'text-[#1C8C64]' : 'text-[#133C2A]'}`}>
                      {group.markedCount}/{group.studentCount}
                    </p>
                    <p className="text-[11px] text-[#133C2A]/50">{isFull ? 'готово' : 'отмечено'}</p>
                  </div>
                  {isFull ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1C8C64]/12 text-[#1C8C64]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="h-6 w-6 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
