import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Filter, MessageSquare, RefreshCw, Send, UserRound } from 'lucide-react';
import {
  CommunicationChatRecord,
  CommunicationMessageRecord,
  loadOwnerCommunicationChats,
  loadOwnerCommunicationMessages,
  sendOwnerCommunicationMessage,
} from '../../lib/backendApi';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'unread' | 'waiting_reply';

function formatMessageTime(value?: Date): string {
  if (!value) return '';
  return value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function OwnerCommunicationPanel() {
  const [chats, setChats] = useState<CommunicationChatRecord[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunicationMessageRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [draft, setDraft] = useState('');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedChat = useMemo(() => chats.find((item) => item.id === selectedChatId) || null, [chats, selectedChatId]);
  const isChatOpened = Boolean(selectedChat);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    chats.forEach((chat) => {
      if (chat.employeeUserId) {
        map.set(chat.employeeUserId, chat.employeeName || chat.employeeUserId);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [chats]);

  const refreshChats = async () => {
    const rows = await loadOwnerCommunicationChats({
      status_filter: statusFilter,
      employee_id: employeeFilter === 'all' ? undefined : employeeFilter,
    });
    setChats(rows);
    if (selectedChatId && !rows.some((chat) => chat.id === selectedChatId)) {
      setSelectedChatId(null);
    }
  };

  const openChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setIsMessagesLoading(true);
    try {
      const rows = await loadOwnerCommunicationMessages(chatId);
      setMessages(rows);
      await refreshChats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить сообщения');
    } finally {
      setIsMessagesLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshChats();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить чаты');
      } finally {
        setIsBootLoading(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!isBootLoading) {
      void refreshChats();
    }
  }, [statusFilter, employeeFilter]);

  const handleSend = async () => {
    if (!selectedChat || !draft.trim()) return;
    setIsSending(true);
    try {
      const saved = await sendOwnerCommunicationMessage(selectedChat.id, draft.trim());
      setMessages((prev) => [...prev, saved]);
      setDraft('');
      await refreshChats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось отправить сообщение');
    } finally {
      setIsSending(false);
    }
  };

  if (isBootLoading) {
    return <div className="text-[#133C2A]/60">Загрузка коммуникаций...</div>;
  }

  if (!isChatOpened) {
    return (
      <Card className="border-none soft-shadow h-[74vh] min-h-[580px] flex flex-col">
        <CardHeader className="space-y-3 border-b border-[#133C2A]/10">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Сообщения
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-full h-8 px-3" onClick={() => setShowFilters((prev) => !prev)}>
                <Filter className="w-4 h-4 mr-1" />
                Фильтр
              </Button>
              <Button variant="outline" size="sm" className="rounded-full h-8 px-3" onClick={() => void refreshChats()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Обновить
              </Button>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} className="rounded-full h-8 px-3" onClick={() => setStatusFilter('all')}>
              Все
            </Button>
            <Button size="sm" variant={statusFilter === 'unread' ? 'default' : 'outline'} className="rounded-full h-8 px-3" onClick={() => setStatusFilter('unread')}>
              Входящие
            </Button>
            <Button size="sm" variant={statusFilter === 'waiting_reply' ? 'default' : 'outline'} className="rounded-full h-8 px-3" onClick={() => setStatusFilter('waiting_reply')}>
              Ждут ответа
            </Button>
          </div>
          {showFilters && (
            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Сотрудник" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все сотрудники</SelectItem>
                {employeeOptions.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
          {chats.length === 0 ? (
            <p className="text-sm text-[#133C2A]/60">Чатов пока нет.</p>
          ) : (
            chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => void openChat(chat.id)}
                className="w-full text-left rounded-xl border border-[#133C2A]/10 hover:bg-[#133C2A]/5 p-2.5 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[#133C2A] truncate">{chat.parentContactLine || chat.parentName}</p>
                    {chat.parentChildLine && <p className="text-xs text-[#133C2A]/60 truncate">{chat.parentChildLine}</p>}
                    <p className="text-sm text-[#133C2A]/70 truncate mt-1">{chat.lastMessageText || 'Нет сообщений'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-[#133C2A]/50">{formatMessageTime(chat.lastMessageAt)}</span>
                    {chat.employeeUnreadCount > 0 && (
                      <Badge className="bg-[#D14343] text-white border-0 rounded-full px-2 py-0.5">
                        {chat.employeeUnreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none soft-shadow h-[74vh] min-h-[580px] flex flex-col">
      <CardHeader className="border-b border-[#133C2A]/10 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedChatId(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-full bg-[#133C2A]/10 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-[#133C2A]" />
          </div>
          <div className="min-w-0">
            <p className="text-[#133C2A] truncate">{selectedChat.parentContactLine || selectedChat.parentName}</p>
            <p className="text-xs text-[#133C2A]/60 truncate">{selectedChat.parentChildLine || selectedChat.parentPhone}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {isMessagesLoading ? (
            <p className="text-sm text-[#133C2A]/60">Загрузка сообщений...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-[#133C2A]/60">Пока нет сообщений.</p>
          ) : (
            messages.map((message) => {
              const isOwnerSide = message.senderRole !== 'parent';
              return (
                <div key={message.id} className={`flex ${isOwnerSide ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[84%] rounded-2xl px-3 py-2 ${
                      isOwnerSide ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white' : 'bg-[#133C2A]/8 text-[#133C2A]'
                    }`}
                  >
                    <p className={`text-[11px] ${isOwnerSide ? 'text-white/85' : 'text-[#133C2A]/60'}`}>
                      {message.senderContactLine || message.senderName}
                    </p>
                    {message.senderChildLine && (
                      <p className={`text-[11px] ${isOwnerSide ? 'text-white/80' : 'text-[#133C2A]/55'} truncate`}>
                        {message.senderChildLine}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words mt-1">{message.text}</p>
                    <p className={`text-[10px] mt-1 ${isOwnerSide ? 'text-white/75' : 'text-[#133C2A]/50'}`}>
                      {formatMessageTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="shrink-0 border-t-2 border-[#D4AF37]/40 bg-[#FFFDF6] px-3 py-3 rounded-b-xl">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ответить..."
            className="rounded-xl min-h-[68px] resize-none border-[#D4AF37]/40 focus-visible:ring-[#D4AF37]"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => void handleSend()}
              disabled={isSending || !draft.trim()}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              <Send className="w-4 h-4 mr-2" />
              Отправить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
