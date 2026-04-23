import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Phone, Mail, MessageCircle, Calendar } from 'lucide-react';
import { Button } from '../ui/button';

interface LeadData {
  id: string;
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childAge: number;
  status: string;
  source: string;
  nextContactDate: Date | null;
  nextAction: string;
  createdDate: Date;
  notes: string;
  tags: string[];
  history: Array<{
    date: Date;
    type: string;
    text: string;
  }>;
}

interface LeadHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadData | null;
}

const historyTypeIcons = {
  call: { emoji: '📞', label: 'Звонок', color: 'text-blue-600', bg: 'bg-blue-50' },
  visit: { emoji: '✅', label: 'Посещение', color: 'text-green-600', bg: 'bg-green-50' },
  meeting: { emoji: '🤝', label: 'Встреча', color: 'text-purple-600', bg: 'bg-purple-50' },
  purchase: { emoji: '💰', label: 'Покупка', color: 'text-[#1C8C64]', bg: 'bg-[#1C8C64]/10' },
  message: { emoji: '💬', label: 'Сообщение', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  email: { emoji: '✉️', label: 'Email', color: 'text-cyan-600', bg: 'bg-cyan-50' },
};

export function LeadHistoryDialog({ isOpen, onClose, lead }: LeadHistoryDialogProps) {
  if (!lead) return null;

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] text-2xl">
            История взаимодействий
          </DialogTitle>
          <DialogDescription>
            Полная история контактов с клиентом
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Информация о клиенте */}
          <Card className="p-4 rounded-2xl border-[#133C2A]/10 bg-gradient-to-br from-white to-[#F8F4E3]/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-[#133C2A] mb-1">{lead.parentName}</h3>
                <p className="text-sm text-[#133C2A]/60">{lead.childName}, {lead.childAge} лет</p>
              </div>
              {lead.tags.length > 0 && (
                <div className="flex gap-2">
                  {lead.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="rounded-lg">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#133C2A]/60" />
                <span className="text-sm text-[#133C2A]">{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#133C2A]/60" />
                  <span className="text-sm text-[#133C2A]/70">{lead.email}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-[#133C2A]/10">
              <Button
                size="sm"
                onClick={() => handleCall(lead.phone)}
                className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#1C8C64] text-white hover:opacity-90 gap-2"
              >
                <Phone className="w-4 h-4" />
                Позвонить
              </Button>
              {lead.email && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEmail(lead.email)}
                  className="rounded-xl border-[#133C2A]/20 gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWhatsApp(lead.phone)}
                className="rounded-xl border-[#133C2A]/20 gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </div>
          </Card>

          {/* Следующий контакт */}
          {lead.nextContactDate && (
            <Card className="p-4 rounded-2xl border-orange-200 bg-gradient-to-br from-white to-orange-50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-orange-900 mb-1">Запланирован следующий контакт</p>
                  <p className="text-xs text-orange-700">
                    {lead.nextContactDate.toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  {lead.nextAction && (
                    <p className="text-sm text-[#133C2A] mt-2">{lead.nextAction}</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* История */}
          <div className="space-y-3">
            <h4 className="text-[#133C2A]">История взаимодействий</h4>
            
            {lead.history.length === 0 ? (
              <Card className="p-8 rounded-2xl border-[#133C2A]/10 text-center">
                <p className="text-sm text-[#133C2A]/60">История пуста</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {lead.history.slice().reverse().map((entry, index) => {
                  const typeInfo = historyTypeIcons[entry.type as keyof typeof historyTypeIcons] || {
                    emoji: '📝',
                    label: 'Запись',
                    color: 'text-gray-600',
                    bg: 'bg-gray-50'
                  };

                  return (
                    <Card key={index} className={`p-4 rounded-2xl border-[#133C2A]/10 ${typeInfo.bg}`}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">{typeInfo.emoji}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className={`${typeInfo.color} rounded-lg text-xs`}>
                              {typeInfo.label}
                            </Badge>
                            <span className="text-xs text-[#133C2A]/60">
                              {entry.date.toLocaleDateString('ru-RU', { 
                                day: 'numeric', 
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-[#133C2A]">{entry.text}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Примечания */}
          {lead.notes && (
            <Card className="p-4 rounded-2xl border-[#D4AF37]/20 bg-gradient-to-br from-white to-[#D4AF37]/5">
              <p className="text-xs text-[#133C2A]/60 mb-2">Примечания</p>
              <p className="text-sm text-[#133C2A]">{lead.notes}</p>
            </Card>
          )}

          {/* Метаданные */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 rounded-xl border-[#133C2A]/10 bg-white">
              <p className="text-xs text-[#133C2A]/60 mb-1">Источник</p>
              <p className="text-sm text-[#133C2A]">{lead.source}</p>
            </Card>
            <Card className="p-3 rounded-xl border-[#133C2A]/10 bg-white">
              <p className="text-xs text-[#133C2A]/60 mb-1">Дата создания</p>
              <p className="text-sm text-[#133C2A]">
                {lead.createdDate.toLocaleDateString('ru-RU', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
