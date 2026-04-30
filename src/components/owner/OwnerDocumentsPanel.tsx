import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';

export function OwnerDocumentsPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [parents, setParents] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<BackendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    setIsLoading(true);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить документы');
    } finally {
      setIsLoading(false);
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить документ');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Document>) => {
    try {
      const updated = await updateDocument(id, updates);
      setDocuments((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success('Документ обновлен');
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить документ');
    }
  };

  if (isLoading || !currentUser) {
    return <div className="text-[#133C2A]/60">Загрузка документов...</div>;
  }

  return (
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
  );
}

