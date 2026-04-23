import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Cake, Gift } from 'lucide-react';
import { Badge } from '../ui/badge';

interface Birthday {
  id: string;
  name: string;
  type: 'student' | 'parent';
  birthDate: Date;
  daysUntil: number;
  age?: number;
  groupName?: string;
  childrenNames?: string[];
}

interface UpcomingBirthdaysProps {
  birthdays: Birthday[];
}

export function UpcomingBirthdays({ birthdays }: UpcomingBirthdaysProps) {
  // Сортируем по дате (ближайшие сначала)
  const sortedBirthdays = [...birthdays].sort((a, b) => a.daysUntil - b.daysUntil);
  
  // Показываем только ближайшие 30 дней
  const upcomingBirthdays = sortedBirthdays.filter(b => b.daysUntil <= 30);

  const formatBirthdayDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long'
    });
  };

  const getDaysText = (days: number) => {
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Завтра';
    if (days <= 4) return `Через ${days} дня`;
    return `Через ${days} дней`;
  };

  return (
    <Card className="border-none soft-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-[#133C2A] flex items-center gap-2 text-lg">
          <Cake className="w-4 h-4 text-[#D4AF37]" />
          Ближайшие дни рождения
          {upcomingBirthdays.length > 0 && (
            <Badge className="bg-pink-50 text-pink-600 border-pink-200 ml-2 text-xs">
              {upcomingBirthdays.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingBirthdays.length > 0 ? (
          <div className="space-y-2">
            {upcomingBirthdays.slice(0, 4).map((birthday) => (
              <div
                key={birthday.id}
                className={`p-3 rounded-xl border transition-smooth ${
                  birthday.daysUntil === 0
                    ? 'bg-pink-50 border-pink-200 hover:bg-pink-100'
                    : birthday.daysUntil <= 7
                    ? 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                    : 'bg-[#F8F4E3] border-[#133C2A]/10 hover:bg-[#F8F4E3]/70'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      birthday.daysUntil === 0
                        ? 'bg-gradient-to-br from-pink-500 to-pink-600'
                        : birthday.daysUntil <= 7
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                        : 'bg-gradient-to-br from-[#D4AF37] to-[#B8941F]'
                    }`}
                  >
                    {birthday.daysUntil === 0 ? (
                      <Gift className="w-4 h-4 text-white" />
                    ) : (
                      <Cake className="w-4 h-4 text-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm text-[#133C2A] line-clamp-1">
                        {birthday.name}
                      </h4>
                      <Badge
                        className={`text-xs ${
                          birthday.daysUntil === 0
                            ? 'bg-pink-100 text-pink-700 border-pink-300'
                            : birthday.daysUntil <= 7
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : 'bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30'
                        }`}
                      >
                        {getDaysText(birthday.daysUntil)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[#133C2A]/60">
                        {formatBirthdayDate(birthday.birthDate)}
                        {birthday.age !== undefined && ` • ${birthday.age} ${birthday.age === 1 ? 'год' : birthday.age < 5 ? 'года' : 'лет'}`}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          birthday.type === 'student'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-green-50 text-green-600 border-green-200'
                        }`}
                      >
                        {birthday.type === 'student' ? 'Ученик' : 'Родитель'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {upcomingBirthdays.length > 4 && (
              <p className="text-xs text-center text-[#133C2A]/60 pt-1">
                Ещё {upcomingBirthdays.length - 4} дней рождения в этом месяце
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-[#133C2A]/60">
            <Cake className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm mb-1">Нет дней рождения в ближайший месяц</p>
            <p className="text-xs">Проверьте позже 📅</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}