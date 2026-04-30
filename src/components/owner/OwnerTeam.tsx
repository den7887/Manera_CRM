import { Users, Plus, Edit, Search, Filter, Mail, Phone, Calendar, Info } from 'lucide-react';
import { useState } from 'react';
import { Employee } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { EditEmployeeDialog } from './EditEmployeeDialog';
import { AddEmployeeDialog } from './AddEmployeeDialog';
import { EmployeeInfoDialog } from './EmployeeInfoDialog';
import { toast } from 'sonner@2.0.3';

interface OwnerTeamProps {
  employees: Employee[];
}

export function OwnerTeam({ employees }: OwnerTeamProps) {
  const getRoleName = (role: string) => {
    switch (role) {
      case 'teacher': return 'Преподаватель';
      case 'admin': return 'Администратор';
      case 'owner': return 'Владелец';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'teacher': return 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30';
      case 'admin': return 'bg-[#133C2A]/20 text-[#133C2A] border-[#133C2A]/30';
      case 'owner': return 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white border-0';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const teachers = employees.filter(e => e.role === 'teacher');
  const admins = employees.filter(e => e.role === 'admin');

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  const handleEditClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
  };

  const handleEditDialogSave = (updatedEmployee: Employee) => {
    // Здесь можно добавить логику сохранения изменений
    toast.success('Изменения сохранены');
    handleEditDialogClose();
  };

  const handleDismissEmployee = (employeeId: string) => {
    // Здесь можно добавить логику увольнения
    toast.success('Сотрудник уволен');
    handleEditDialogClose();
  };

  const handleToggleStatus = (employeeId: string) => {
    // Здесь можно добавить логику изменения статуса
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      const newStatus = employee.status === 'active' ? 'заблокирован' : 'активирован';
      toast.success(`Профиль сотрудника ${newStatus}`);
    }
  };

  const handleAddDialogClose = () => {
    setIsAddDialogOpen(false);
  };

  const handleAddDialogSave = (newEmployee: Employee) => {
    // Здесь можно добавить логику добавления нового сотрудника
    toast.success('Сотрудник добавлен');
    handleAddDialogClose();
  };

  const handleInfoClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsInfoDialogOpen(true);
  };

  const handleInfoDialogClose = () => {
    setIsInfoDialogOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Команда студии</h1>
          <p className="text-[#133C2A]/60">Управление преподавателями и администраторами</p>
        </div>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-5 h-5" />
          Добавить сотрудника
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Преподавателей</p>
                <p className="text-3xl text-[#133C2A]">{teachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Администраторов</p>
                <p className="text-3xl text-[#133C2A]">{admins.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1C8C64] to-[#133C2A] flex items-center justify-center">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего сотрудников</p>
                <p className="text-3xl text-[#133C2A]">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                placeholder="Поиск по имени или email..."
                className="pl-12 h-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
            <Button variant="outline" className="rounded-2xl border-[#133C2A]/20 gap-2">
              <Filter className="w-4 h-4" />
              Фильтры
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <Card key={employee.id} className="border-none soft-shadow hover-lift">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Avatar className="w-16 h-16 border-2 border-[#D4AF37]">
                  <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white text-xl">
                    {employee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => handleInfoClick(employee)}>
                    <Info className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => handleEditClick(employee)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h3 className="text-[#133C2A] mb-2">{employee.name}</h3>
              <Badge className={`${getRoleBadgeColor(employee.role)} mb-4`}>
                {getRoleName(employee.role)}
              </Badge>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-[#133C2A]/70">
                  <Mail className="w-4 h-4 text-[#D4AF37]" />
                  <span className="truncate">{employee.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#133C2A]/70">
                  <Phone className="w-4 h-4 text-[#D4AF37]" />
                  {employee.phone}
                </div>
                {employee.lastLogin && (
                  <div className="flex items-center gap-3 text-sm text-[#133C2A]/70">
                    <Calendar className="w-4 h-4 text-[#D4AF37]" />
                    Вход: {employee.lastLogin.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                )}
              </div>

              {employee.role === 'teacher' && employee.groupsAssigned && (
                <div className="mt-4 pt-4 border-t border-[#133C2A]/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#133C2A]/70">Назначено групп</span>
                    <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A]">
                      {employee.groupsAssigned}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Badge 
                  variant="outline"
                  className={
                    employee.status === 'active'
                      ? 'border-[#1C8C64]/20 text-[#1C8C64] bg-[#1C8C64]/10 w-full justify-center'
                      : 'border-gray-200 text-gray-600 bg-gray-50 w-full justify-center'
                  }
                >
                  {employee.status === 'active' ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Employee Dialog */}
      {isEditDialogOpen && selectedEmployee && (
        <EditEmployeeDialog
          employee={selectedEmployee}
          isOpen={isEditDialogOpen}
          onClose={handleEditDialogClose}
          onSave={handleEditDialogSave}
          onDismiss={handleDismissEmployee}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Add Employee Dialog */}
      {isAddDialogOpen && (
        <AddEmployeeDialog
          isOpen={isAddDialogOpen}
          onClose={handleAddDialogClose}
          onSave={handleAddDialogSave}
        />
      )}

      {/* Employee Info Dialog */}
      {isInfoDialogOpen && selectedEmployee && (
        <EmployeeInfoDialog
          employee={selectedEmployee}
          isOpen={isInfoDialogOpen}
          onClose={handleInfoDialogClose}
        />
      )}
    </div>
  );
}