import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Document, Employee, User } from '../../types';
import {
  BackendUser,
  createDocument,
  deleteDocument,
  loadAdminClients,
  loadCurrentUser,
  loadDocuments,
  loadOwnerEmployees,
  updateDocument,
} from '../../lib/backendApi';
import { DocumentsManagement } from '../admin/DocumentsManagement';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { toast } from 'sonner';

export function OwnerDocumentsPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [parents, setParents] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setLoadError(null);
    try {
      const [docs, ownerEmployees, clients, user] = await Promise.all([
        loadDocuments(),
        loadOwnerEmployees(),
        loadAdminClients(),
        loadCurrentUser(),
      ]);
      setDocuments(docs);
      setCurrentUser(user);

      const normalizedEmployees: User[] = ownerEmployees.map((employee: Employee) => ({
        id: employee.id,
        name: employee.name,
        phone: employee.phone || '',
        role: employee.role,
        email: employee.email || undefined,
      }));
      setEmployees(normalizedEmployees);

      const uniqueParents = new Map<string, User>();
      clients.forEach((client) => {
        if (!client.parentUserId) {
          return;
        }
        uniqueParents.set(client.parentUserId, {
          id: client.parentUserId,
          name: client.parentName || client.parentPhone,
          phone: client.parentPhone,
          role: 'parent',
        });
      });
      setParents(Array.from(uniqueParents.values()));
      setLastSyncedAt(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось загрузить документы';
      setLoadError(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleAdd = async (payload: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const optimistic: Document = {
      ...payload,
      id: `doc-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const created = await createDocument(optimistic);
      setDocuments((prev) => [created, ...prev]);
      toast.success('Документ добавлен');
      void refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить документ');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Document>) => {
    try {
      const updated = await updateDocument(id, updates);
      setDocuments((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Документ обновлен');
      void refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить документ');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить документ?')) {
      return;
    }
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((item) => item.id !== id));
      toast.success('Документ удален');
      void refresh(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить документ');
    }
  };

  if (isLoading) {
    return <div className="text-[#133C2A]/60">Загрузка документов...</div>;
  }

  if (!currentUser) {
    return (
      <Card className="border-none soft-shadow">
        <CardContent className="p-6 space-y-3">
          <p className="text-[#133C2A]">Не удалось загрузить профиль владельца.</p>
          {loadError && <p className="text-sm text-[#D14343]">{loadError}</p>}
          <Button variant="outline" className="rounded-xl" onClick={() => void refresh()}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#133C2A]/60">
          {lastSyncedAt ? `Последнее обновление: ${lastSyncedAt.toLocaleString('ru-RU')}` : 'Синхронизация не выполнена'}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl sm:w-auto"
          onClick={() => void refresh(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {isRefreshing ? 'Обновляем...' : 'Обновить'}
        </Button>
      </div>

      {loadError && (
        <Card className="border-[#D14343]/25 bg-[#FFF5F5]">
          <CardContent className="p-3 text-sm text-[#B83A3A]">{loadError}</CardContent>
        </Card>
      )}

      <DocumentsManagement
        documents={documents}
        employees={employees}
        parents={parents}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        onAddDocument={(payload) => void handleAdd(payload)}
        onUpdateDocument={(id, updates) => void handleUpdate(id, updates)}
        onDeleteDocument={(id) => void handleDelete(id)}
      />
    </div>
  );
}
