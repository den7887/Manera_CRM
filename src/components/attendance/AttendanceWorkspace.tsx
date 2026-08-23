import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Check, MoreVertical, Phone, Users, X } from 'lucide-react';
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

function formatDateLabel(dateStr: string): string {
  const parsed = new Date(`${dateStr}T00:00:00`);
  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' });
}

const badgeDotClass: Record<string, string> = {
  green: 'bg-[#1C8C64]',
  yellow: 'bg-[#D4AF37]',
  red: 'bg-[#D14343]',
};

interface AttendanceWorkspaceProps {
  onOpenClient?: (clientId: string) => void;
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

  if (selectedGroupId) {
    return (
      <Card className="border-none soft-shadow">
        <CardHeader className="border-b border-[#133C2A]/10 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setSelectedGroupId(null); setRoster(null); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[#133C2A] truncate">{roster?.groupName || 'Группа'}</p>
              <p className="text-xs text-[#133C2A]/60 truncate">{formatDateLabel(selectedDate)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-2">
          {isLoadingRoster ? (
            <p className="text-sm text-[#133C2A]/60 py-6 text-center">Загрузка...</p>
          ) : !roster || roster.students.length === 0 ? (
            <p className="text-sm text-[#133C2A]/60 py-6 text-center">В этой группе пока нет учеников.</p>
          ) : (
            roster.students.map((student) => {
              const isPending = pendingChildId === student.childId;
              return (
                <div key={student.childId} className="flex items-center gap-2 rounded-2xl border border-[#133C2A]/10 bg-white p-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${badgeDotClass[student.attendanceStatusColor] || 'bg-[#133C2A]/20'}`} title={student.attendanceStatusLabel} />
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
                        onClick={() => student.clientId && onOpenClient?.(student.clientId)}
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
    );
  }

  return (
    <Card className="border-none soft-shadow">
      <CardHeader className="space-y-3 border-b border-[#133C2A]/10 p-3 md:p-6">
        <CardTitle className="text-[#133C2A] flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Посещаемость
        </CardTitle>
        <Input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          className="rounded-2xl w-full sm:w-56"
        />
        {!isLoadingDay && groups.length > 0 && (
          <p className="text-sm text-[#133C2A]/60">Отмечено {totalMarked} из {totalStudents}</p>
        )}
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {isLoadingDay ? (
          <p className="text-sm text-[#133C2A]/60 py-6 text-center">Загрузка...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-[#133C2A]/60 py-6 text-center">На {formatDateLabel(selectedDate)} занятий не запланировано.</p>
        ) : (
          groups.map((group) => (
            <button
              key={group.groupId}
              onClick={() => void openGroup(group.groupId)}
              className="w-full text-left rounded-2xl border border-[#133C2A]/10 hover:bg-[#133C2A]/5 p-3 transition flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[#133C2A] truncate">{group.groupName}</p>
                <p className="text-xs text-[#133C2A]/60 truncate">
                  {group.time ? `${group.time} · ` : ''}{group.teacherName || 'Педагог не назначен'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm text-[#133C2A]">{group.markedCount}/{group.studentCount}</p>
                <p className="text-[11px] text-[#133C2A]/50">отмечено</p>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
