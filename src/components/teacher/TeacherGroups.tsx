import { Users, Calendar, TrendingUp } from 'lucide-react';
import { Group } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface TeacherGroupsProps {
  groups: Group[];
}

export function TeacherGroups({ groups }: TeacherGroupsProps) {
  const handleViewStudents = (groupName: string) => {
    toast.info('Просмотр учеников', {
      description: `Открываем список учеников группы "${groupName}"`,
      duration: 2000,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Мои группы</h1>
        <p className="text-[#133C2A]/60">Просмотр групп и составов</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="border-none soft-shadow hover-lift">
            <div 
              className="h-3 rounded-t-2xl"
              style={{ backgroundColor: group.color }}
            />
            <CardHeader>
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
                  style={{ backgroundColor: group.color }}
                >
                  <Users className="w-8 h-8" />
                </div>
              </div>
              <CardTitle className="text-[#133C2A]">{group.name}</CardTitle>
              <Badge variant="outline" className="border-[#133C2A]/20 text-[#133C2A] w-fit">
                {group.ageRange}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8F4E3]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#133C2A]/70">Учеников в группе</span>
                  <span className="text-2xl text-[#133C2A]">{group.studentCount}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[#133C2A]/70">{group.schedule}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[#133C2A]/70">Средняя посещаемость: 87%</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#133C2A]/10">
                <Button 
                  onClick={() => handleViewStudents(group.name)}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                >
                  Просмотреть учеников
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
