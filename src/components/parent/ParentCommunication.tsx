import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageSquare, Plus, Send, UserRound } from 'lucide-react';
import {
  CommunicationChatRecord,
  CommunicationEmployeeOption,
  CommunicationMessageRecord,
  createParentCommunicationChat,
  loadParentCommunicationChats,
  loadParentCommunicationEmployees,
  loadParentCommunicationMessages,
  sendParentCommunicationMessage,
} from '../../lib/backendApi';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

function formatMessageTime(value?: Date): string {
  if (!value) return '';
  return value.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function ParentCommunication() {
  const [employees, setEmployees] = useState<CommunicationEmployeeOption[]>([]);
  const [chats, setChats] = useState<CommunicationChatRecord[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunicationMessageRecord[]>([]);
  const [employeeToStart, setEmployeeToStart] = useState('');
  const [draft, setDraft] = useState('');
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const selectedChat = useMemo(() => chats.find((item) => item.id === selectedChatId) || null, [chats, selectedChatId]);
  const isChatOpened = Boolean(selectedChat);

  const refreshChats = async () => {
    const rows = await loadParentCommunicationChats();
    setChats(rows);
    if (selectedChatId && !rows.some((chat) => chat.id === selectedChatId)) {
      setSelectedChatId(null);
    }
  };

  const openChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setIsMessagesLoading(true);
    try {
      const rows = await loadParentCommunicationMessages(chatId);
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
        const [employeeRows, chatRows] = await Promise.all([
          loadParentCommunicationEmployees(),
          loadParentCommunicationChats(),
        ]);
        setEmployees(employeeRows);
        setChats(chatRows);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось загрузить коммуникации');
      } finally {
        setIsBootLoading(false);
      }
    };
    void bootstrap();
  }, []);

  const handleCreateChat = async () => {
    if (!employeeToStart) {
      toast.info('Выберите сотрудника');
      return;
    }
    setIsCreatingChat(true);
    try {
      const chat = await createParentCommunicationChat(employeeToStart);
      setChats((prev) => [chat, ...prev.filter((item) => item.id !== chat.id)]);
      setEmployeeToStart('');
      await openChat(chat.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать чат');
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSend = async () => {
    if (!selectedChat || !draft.trim()) return;
    setIsSending(true);
    try {
      const saved = await sendParentCommunicationMessage(selectedChat.id, draft.trim());
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
      <Card className="border-none soft-shadow h-[calc(100dvh-11rem)] min-h-[420px] flex flex-col md:h-[74vh] md:min-h-[580px]">
        <CardHeader className="space-y-3 border-b border-[#133C2A]/10 p-3 md:p-6">
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Сообщения
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
            <Select value={employeeToStart} onValueChange={setEmployeeToStart}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Выберите сотрудника для нового чата" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name} ({employee.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => void handleCreateChat()}
              disabled={isCreatingChat}
              className="rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Новый чат
            </Button>
          </div>
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
                    <p className="text-[#133C2A] truncate">{chat.employeeName || 'Сотрудник'}</p>
                    <p className="text-xs text-[#133C2A]/60 truncate">{chat.employeeContactLine || chat.employeeRole}</p>
                    <p className="text-sm text-[#133C2A]/70 truncate mt-1">{chat.lastMessageText || 'Нет сообщений'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-[#133C2A]/50">{formatMessageTime(chat.lastMessageAt)}</span>
                    {chat.parentUnreadCount > 0 && (
                      <Badge className="bg-[#D14343] text-white border-0 rounded-full px-2 py-0.5">
                        {chat.parentUnreadCount}
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
    <Card className="border-none soft-shadow h-[calc(100dvh-11rem)] min-h-[420px] flex flex-col md:h-[74vh] md:min-h-[580px]">
      <CardHeader className="border-b border-[#133C2A]/10 py-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedChatId(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-9 h-9 rounded-full bg-[#133C2A]/10 flex items-center justify-center">
            <UserRound className="w-5 h-5 text-[#133C2A]" />
          </div>
          <div className="min-w-0">
            <p className="text-[#133C2A] truncate">{selectedChat.employeeName || 'Сотрудник'}</p>
            <p className="text-xs text-[#133C2A]/60 truncate">{selectedChat.employeeContactLine || selectedChat.employeeRole}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {isMessagesLoading ? (
            <p className="text-sm text-[#133C2A]/60">Загрузка сообщений...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-[#133C2A]/60">Начните диалог первым.</p>
          ) : (
            messages.map((message) => {
              const isMine = message.senderRole === 'parent';
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[84%] rounded-2xl px-3 py-2 ${
                      isMine ? 'bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-white' : 'bg-[#133C2A]/8 text-[#133C2A]'
                    }`}
                  >
                    <p className={`text-[11px] ${isMine ? 'text-white/85' : 'text-[#133C2A]/60'}`}>
                      {message.senderContactLine || message.senderName}
                    </p>
                    {message.senderChildLine && (
                      <p className={`text-[11px] ${isMine ? 'text-white/80' : 'text-[#133C2A]/55'} truncate`}>
                        {message.senderChildLine}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words mt-1">{message.text}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/75' : 'text-[#133C2A]/50'}`}>
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
            placeholder="Введите сообщение..."
            className="rounded-xl min-h-[68px] resize-none border-[#D4AF37]/40 focus-visible:ring-[#D4AF37]"
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => void handleSend()}
              disabled={isSending || draft.trim().length === 0}
              className="w-full rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90 sm:w-auto"
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
