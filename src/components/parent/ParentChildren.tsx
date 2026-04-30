import { AlertCircle, CreditCard, Info, Users } from 'lucide-react';
import { Child } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface ParentChildrenProps {
  children: Child[];
  onNavigate?: (page: string) => void;
}

function childStatus(child: Child): {
  label: string;
  tone: string;
  urgent: boolean;
} {
  if (child.totalClasses <= 0) {
    return { label: 'Ожидает назначение', tone: 'border-[#133C2A]/20 text-[#133C2A]/70 bg-white', urgent: false };
  }
  if (child.remainingClasses <= 0) {
    return { label: 'Абонемент закончился', tone: 'border-[#D14343]/30 text-[#D14343] bg-[#D14343]/5', urgent: true };
  }
  if (child.remainingClasses <= 2) {
    return { label: 'Требуется продление', tone: 'border-[#D4AF37]/40 text-[#B8941F] bg-[#D4AF37]/10', urgent: true };
  }
  return { label: 'Активен', tone: 'border-[#1C8C64]/30 text-[#1C8C64] bg-[#1C8C64]/8', urgent: false };
}

export function ParentChildren({ children, onNavigate }: ParentChildrenProps) {
  const renewalList = children.filter((child) => child.totalClasses > 0 && child.remainingClasses <= 2);

  return (
    <div className="space-y-4 animate-scale-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[#133C2A] text-xl">Мои дети</h2>
          <p className="text-sm text-[#133C2A]/60">Профили учеников и текущее состояние абонементов</p>
        </div>
        <Badge variant="outline" className="rounded-full border-[#133C2A]/20 text-[#133C2A]">
          Всего детей: {children.length}
        </Badge>
      </div>

      {renewalList.length > 0 && (
        <Card className="border-none soft-shadow">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-[#133C2A] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#D4AF37]" />
                  Требуется продление
                </p>
                <p className="text-sm text-[#133C2A]/70 mt-1">
                  {renewalList.map((child) => `${child.name} (${Math.max(child.remainingClasses, 0)})`).join(', ')}
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                onClick={() => onNavigate?.('payments')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Перейти к оплате
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none soft-shadow">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start gap-2 text-sm text-[#133C2A]/70">
            <Info className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
            <p>
              Добавление нового ребёнка и изменение персональных данных выполняется владельцем/администратором.
            </p>
          </div>
        </CardContent>
      </Card>

      {children.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-10 text-center text-[#133C2A]/60">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>В вашем профиле пока нет добавленных детей.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {children.map((child) => {
            const status = childStatus(child);
            const progress = child.totalClasses > 0 ? Math.round((child.attendedClasses / child.totalClasses) * 100) : 0;
            return (
              <Card key={child.id} className="border-none soft-shadow overflow-hidden">
                <div className={`h-1.5 ${status.urgent ? 'bg-gradient-to-r from-[#D4AF37] to-[#D14343]' : 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37]'}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border border-[#D4AF37]">
                      <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                        {child.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="text-[#133C2A] text-base truncate">{child.name}</CardTitle>
                      <p className="text-xs text-[#133C2A]/60 truncate">
                        {child.age} лет • {child.groupName || 'Группа не назначена'}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <Badge variant="outline" className={`rounded-full ${status.tone}`}>
                    {status.label}
                  </Badge>

                  <div className="rounded-xl border border-[#133C2A]/10 p-3 bg-white">
                    <p className="text-xs text-[#133C2A]/60">Абонемент</p>
                    <p className="text-sm text-[#133C2A] truncate mt-1">{child.subscriptionName || 'Не назначен'}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div>
                        <p className="text-[#133C2A]/55">Осталось</p>
                        <p className="text-[#133C2A] mt-0.5">{Math.max(child.remainingClasses, 0)}</p>
                      </div>
                      <div>
                        <p className="text-[#133C2A]/55">Посещено</p>
                        <p className="text-[#133C2A] mt-0.5">{child.attendedClasses}</p>
                      </div>
                    </div>
                    {child.totalClasses > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-[#133C2A]/60 mb-1">
                          <span>Прогресс</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  {status.urgent && (
                    <Button
                      size="sm"
                      className="w-full rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
                      onClick={() => onNavigate?.('payments')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Продлить абонемент
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
