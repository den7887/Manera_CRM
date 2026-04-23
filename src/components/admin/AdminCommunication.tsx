import { MessageSquare, Send, FileText, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Mock message templates
const messageTemplates = [
  {
    id: '1',
    title: 'Напоминание об оплате',
    content: 'Уважаемые родители! Напоминаем, что оплата абонемента должна быть произведена до конца недели. Спасибо за понимание!',
  },
  {
    id: '2',
    title: 'Отмена занятия',
    content: 'Уважаемые родители! Занятие [дата] отменяется. Перенос на [новая дата]. Приносим извинения за неудобства!',
  },
  {
    id: '3',
    title: 'Приглашение на мероприятие',
    content: 'Приглашаем вас на отчетный концерт нашей студии! Дата: [дата], время: [время]. Ждем вас!',
  },
];

// Mock sent messages
const sentMessages = [
  {
    id: '1',
    title: 'Напоминание об оплате',
    recipients: 'Младшая группа',
    date: new Date(2025, 10, 8),
    status: 'sent',
  },
  {
    id: '2',
    title: 'Приглашение на концерт',
    recipients: 'Все группы',
    date: new Date(2025, 10, 5),
    status: 'sent',
  },
];

export function AdminCommunication() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-scale-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Коммуникация</h1>
          <p className="text-[#133C2A]/60">Отправка сообщений и уведомлений родителям</p>
        </div>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2">
          <Plus className="w-5 h-5" />
          Новое сообщение
        </Button>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="bg-white border border-[#133C2A]/10">
          <TabsTrigger value="compose" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Создать
          </TabsTrigger>
          <TabsTrigger value="templates" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Шаблоны
          </TabsTrigger>
          <TabsTrigger value="sent" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#133C2A] data-[state=active]:to-[#D4AF37] data-[state=active]:text-white">
            Отправленные
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Новое сообщение</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-[#133C2A]">Получатели</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
                  <Input
                    placeholder="Выберите группу или отдельных родителей..."
                    className="pl-12 h-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                  />
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-[#133C2A]/20 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition-smooth px-4 py-2"
                  >
                    Все группы
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-[#133C2A]/20 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition-smooth px-4 py-2"
                    style={{ borderLeftWidth: '4px', borderLeftColor: '#D4AF37' }}
                  >
                    Младшая группа
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer border-[#133C2A]/20 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37] transition-smooth px-4 py-2"
                    style={{ borderLeftWidth: '4px', borderLeftColor: '#133C2A' }}
                  >
                    Средняя группа
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#133C2A]">Тема сообщения</label>
                <Input
                  placeholder="Введите тему..."
                  className="h-12 rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[#133C2A]">Текст сообщения</label>
                <Textarea
                  placeholder="Введите текст сообщения..."
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[200px]"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-2xl border-[#133C2A]/20"
                >
                  Сохранить как черновик
                </Button>
                <Button 
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 gap-2"
                >
                  <Send className="w-4 h-4" />
                  Отправить
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {messageTemplates.map((template) => (
              <Card key={template.id} className="border-none soft-shadow hover-lift">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-[#133C2A] text-base">
                        {template.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-[#133C2A]/70 mb-4 line-clamp-3">
                    {template.content}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-2xl border-[#133C2A]/20 hover:bg-[#133C2A]/5"
                  >
                    Использовать шаблон
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Card className="border-none soft-shadow border-2 border-dashed border-[#133C2A]/20 hover:border-[#D4AF37] transition-smooth cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[200px]">
                <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <p className="text-[#133C2A]">Создать шаблон</p>
                <p className="text-sm text-[#133C2A]/60 text-center mt-2">
                  Сохраните часто используемые сообщения
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          <Card className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A]">Отправленные сообщения</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sentMessages.map((message) => (
                  <div
                    key={message.id}
                    className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#D4AF37] flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[#133C2A] mb-1">{message.title}</h4>
                        <p className="text-sm text-[#133C2A]/60">
                          Получатели: {message.recipients}
                        </p>
                        <p className="text-xs text-[#133C2A]/50 mt-2">
                          {message.date.toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                      <Badge className="bg-[#1C8C64]/10 text-[#1C8C64] border-[#1C8C64]/20">
                        Отправлено
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}