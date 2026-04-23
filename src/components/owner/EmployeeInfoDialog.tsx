import { Info, Mail, Phone, Calendar, MapPin, Briefcase, Shield } from 'lucide-react';
import { Employee } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';

interface EmployeeInfoDialogProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeInfoDialog({ employee, isOpen, onClose }: EmployeeInfoDialogProps) {
  if (!employee) return null;

  const getRoleName = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'Преподаватель';
      case 'admin':
        return 'Администратор';
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'teacher':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Группировка полномочий по категориям
  const groupPermissions = (permissions: string[] = []) => {
    const groups: { [key: string]: string[] } = {
      schedule: [],
      students: [],
      groups: [],
      payments: [],
      communication: [],
      tasks: [],
    };

    permissions.forEach((perm) => {
      const category = perm.split('.')[0];
      if (groups[category]) {
        groups[category].push(perm);
      }
    });

    return groups;
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      schedule: 'Расписание',
      students: 'Ученики',
      groups: 'Группы',
      payments: 'Платежи и абонементы',
      communication: 'Коммуникация',
      tasks: 'Задачи',
    };
    return names[category] || category;
  };

  const permissionGroups = groupPermissions(employee.permissions);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] flex items-center gap-2">
            <Info className="w-5 h-5" />
            Информация о сотруднике
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Основная информация */}
          <div className="flex items-start gap-4">
            <Avatar className="w-20 h-20 border-2 border-[#D4AF37]">
              <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-2xl">
                {employee.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-[#133C2A] mb-2">{employee.name}</h3>
              <div className="flex gap-2 mb-3">
                <Badge className={getRoleBadgeColor(employee.role)}>
                  {getRoleName(employee.role)}
                </Badge>
                <Badge
                  className={
                    employee.status === 'active'
                      ? 'bg-[#1C8C64]/20 text-[#1C8C64] border-[#1C8C64]/30'
                      : 'bg-gray-200 text-gray-600 border-gray-300'
                  }
                >
                  {employee.status === 'active' ? 'Активен' : 'Заблокирован'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Контактные данные */}
          <div className="space-y-3">
            <h4 className="text-[#133C2A]">Контактные данные</h4>
            <div className="space-y-3 p-4 rounded-2xl bg-[#F8F4E3]/50">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                <span className="text-[#133C2A]/80">{employee.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                <span className="text-[#133C2A]/80">{employee.phone}</span>
              </div>
              {employee.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                  <span className="text-[#133C2A]/80">{employee.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="space-y-3">
            <h4 className="text-[#133C2A]">Дополнительная информация</h4>
            <div className="space-y-3 p-4 rounded-2xl bg-[#F8F4E3]/50">
              {employee.birthDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-[#133C2A]/60">Дата рождения</div>
                    <div className="text-[#133C2A]/80">
                      {new Date(employee.birthDate).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              )}
              {employee.experience && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-[#133C2A]/60">Опыт работы</div>
                    <div className="text-[#133C2A]/80">{employee.experience}</div>
                  </div>
                </div>
              )}
              {employee.lastLogin && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-[#133C2A]/60">Последний вход</div>
                    <div className="text-[#133C2A]/80">
                      {employee.lastLogin.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              )}
              {employee.role === 'teacher' && employee.groupsAssigned !== undefined && (
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-[#133C2A]/60">Назначено групп</div>
                    <div className="text-[#133C2A]/80">{employee.groupsAssigned}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Полномочия */}
          {employee.permissions && employee.permissions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[#133C2A]">Полномочия</h4>
              <div className="space-y-3">
                {Object.entries(permissionGroups).map(([category, perms]) => {
                  if (perms.length === 0) return null;
                  return (
                    <div key={category} className="p-4 rounded-2xl bg-[#F8F4E3]/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-[#133C2A]">{getCategoryName(category)}</span>
                        <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-0">
                          {perms.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 pl-6">
                        {perms.map((perm) => (
                          <div key={perm} className="text-sm text-[#133C2A]/70">
                            • {perm.split('.')[1].replace(/_/g, ' ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
