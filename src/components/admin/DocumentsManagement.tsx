import { useState } from 'react';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Plus,
  FileType,
  Calendar,
  User,
  Tag,
  X,
  Edit,
  ClipboardCheck,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Document, DocumentCategory, User as UserType } from '../../types';
import { AddDocumentDialog } from './AddDocumentDialog';
import { ViewDocumentDialog } from './ViewDocumentDialog';
import { EditDocumentDialog } from './EditDocumentDialog';
import { EmptyState } from '../EmptyState';

interface DocumentsManagementProps {
  documents: Document[];
  employees: UserType[];
  parents: UserType[];
  currentUserId: string;
  currentUserName: string;
  onAddDocument: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateDocument: (id: string, updates: Partial<Document>) => void;
  onDeleteDocument: (id: string) => void;
}

const categoryLabels: Record<DocumentCategory, string> = {
  contract: 'Договоры',
  policy: 'Политики и правила',
  instruction: 'Инструкции',
  template: 'Шаблоны',
  certificate: 'Сертификаты и лицензии',
  report: 'Отчеты',
  checklist: 'Чек-листы',
  other: 'Прочее',
};

const categoryColors: Record<DocumentCategory, string> = {
  contract: 'bg-[#EEF5F0] text-[#133C2A] border-[#133C2A]/20',
  policy: 'bg-[#FFF9E8] text-[#8B6B00] border-[#D4AF37]/30',
  instruction: 'bg-[#EAF7F1] text-[#1C8C64] border-[#1C8C64]/25',
  template: 'bg-[#FFF1E8] text-[#B85A2E] border-[#B85A2E]/25',
  certificate: 'bg-[#FFF3F4] text-[#B85A6B] border-[#FADADD]',
  report: 'bg-[#F1ECE0] text-[#5B5140] border-[#B85A2E]/15',
  checklist: 'bg-[#133C2A]/8 text-[#0F3021] border-[#133C2A]/25',
  other: 'bg-[#F8F4E3] text-[#133C2A]/70 border-[#133C2A]/12',
};

const fileTypeIcons: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  xls: '📊',
  xlsx: '📊',
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  txt: '📃',
  zip: '📦',
  rar: '📦',
};

export function DocumentsManagement({ 
  documents, 
  employees,
  parents,
  currentUserId,
  currentUserName,
  onAddDocument, 
  onUpdateDocument,
  onDeleteDocument 
}: DocumentsManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [editDocument, setEditDocument] = useState<Document | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Фильтрация документов
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = (doc.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    
    const matchesEmployee = selectedEmployee === 'all' || 
                           doc.assignedEmployees.length === 0 || 
                           doc.assignedEmployees.includes(selectedEmployee);
    
    return matchesSearch && matchesCategory && matchesEmployee;
  });

  // Группировка по категориям
  const documentsByCategory = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<DocumentCategory, Document[]>);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEmployeeNames = (employeeIds: string[]): string => {
    if (employeeIds.length === 0) return 'Все сотрудники';
    const names = employeeIds
      .map(id => employees.find(e => e.id === id)?.name)
      .filter(Boolean);
    return names.join(', ') || 'Не назначено';
  };

  const handleDownload = (doc: Document) => {
    // В реальном приложении здесь будет загрузка файла
    console.log('Downloading:', doc.fileName);
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  const handleCreateDailyChecklist = () => {
    const today = new Date();
    const dateString = today.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const checklistItems = [
      'Проверка чистоты танцевальных залов',
      'Проверка работоспособности аудиосистемы',
      'Проверка зеркал и их чистоты',
      'Проверка температуры и вентиляции',
      'Проверка наличия питьевой воды',
      'Проверка санузлов и раздевалок',
      'Проверка расписания занятий на день',
      'Подготовка необходимого инвентаря',
      'Проверка наличия медицинской аптечки',
      'Уборка зоны ресепшн',
    ];

    // Создаем текстовый файл с чек-листом
    const content = `ЕЖЕДНЕВНЫЙ ЧЕК-ЛИСТ СТУДИИ ТАНЦА "MANERA"\nДата: ${dateString}\n\n${checklistItems.map((item, idx) => `${idx + 1}. [ ] ${item}`).join('\n')}\n\n---\nСоставил: ${currentUserName}\nДата создания: ${dateString}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const fileUrl = URL.createObjectURL(blob);
    const reader = new FileReader();
    
    reader.onload = () => {
      const newChecklist: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
        name: `Ежедневный чек-лист - ${dateString}`,
        description: 'Контрольный список ежедневных проверок и задач студии',
        category: 'checklist',
        fileName: `daily-checklist-${dateString.replace(/\./g, '-')}.txt`,
        fileType: 'txt',
        fileSize: blob.size,
        fileUrl: reader.result as string,
        accessType: 'employees',
        assignedEmployees: employees.map(e => e.id),
        assignedParents: [],
        createdBy: currentUserId,
        createdByName: currentUserName,
        tags: ['ежедневный', 'контроль', 'проверка'],
        checklistItems,
      };

      onAddDocument(newChecklist);
    };

    reader.readAsDataURL(blob);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="rounded-[28px] border border-[#133C2A]/10 bg-gradient-to-r from-[#133C2A] to-[#1d5a3f] px-5 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.16em] text-white/65">Документация студии</p>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl">Общая база документов</h2>
            <p className="mt-1 text-sm text-white/72">Договоры, инструкции и чек-листы в одном месте.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-white/72">
            <span>{documents.length} документов</span>
            <span>•</span>
            <span>{Object.keys(documentsByCategory).length} категорий</span>
            <span>•</span>
            <span>{documents.filter(d => new Date(d.createdAt).toDateString() === new Date().toDateString()).length} загружено сегодня</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Документация</h1>
          <p className="text-[#133C2A]/60">
            Управление документами студии
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить документ
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Всего документов</p><p className="mt-1 text-3xl text-[#133C2A]">{documents.length}</p><p className="mt-2 text-xs text-[#133C2A]/45">В базе студии</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Категорий</p><p className="mt-1 text-3xl text-[#133C2A]">{Object.keys(documentsByCategory).length}</p><p className="mt-2 text-xs text-[#133C2A]/45">Разделов документации</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Сотрудников</p><p className="mt-1 text-3xl text-[#133C2A]">{employees.length}</p><p className="mt-2 text-xs text-[#133C2A]/45">Имеют доступ к загрузке</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-4"><p className="text-sm text-[#133C2A]/55">Загружено сегодня</p><p className="mt-1 text-3xl text-[#133C2A]">{documents.filter(d => new Date(d.createdAt).toDateString() === new Date().toDateString()).length}</p><p className="mt-2 text-xs text-[#133C2A]/45">Новых документов за день</p></CardContent></Card>
      </div>

      {/* Search and Filters */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#133C2A]/40" />
                <Input
                  placeholder="Поиск по названию, описанию или тегам..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-[#133C2A]/20"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`rounded-xl ${showFilters ? 'bg-[#D4AF37]/10 border-[#D4AF37]' : ''}`}
              >
                <Filter className="w-4 h-4 mr-2" />
                Фильтры
              </Button>
            </div>

            {showFilters && (
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-[#F8F4E3] rounded-2xl">
                <div>
                  <label className="text-sm text-[#133C2A]/70 mb-2 block">Категория</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory | 'all')}
                    className="w-full rounded-xl border-[#133C2A]/20 p-2 bg-white"
                  >
                    <option value="all">Все категории</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-[#133C2A]/70 mb-2 block">Сотрудник</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full rounded-xl border-[#133C2A]/20 p-2 bg-white"
                  >
                    <option value="all">Все сотрудники</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents by Category */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent>
            <EmptyState
              icon={FileText}
              title={documents.length === 0 ? 'Документов пока нет' : 'Ничего не найдено'}
              description={documents.length === 0 ? 'Загрузите первый документ студии.' : 'Попробуйте изменить поиск или фильтры.'}
              actionLabel={documents.length === 0 ? 'Добавить документ' : undefined}
              onAction={documents.length === 0 ? () => setShowAddDialog(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        Object.entries(documentsByCategory).map(([category, docs]) => (
          <Card key={category} className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <FileType className="w-5 h-5 text-[#D4AF37]" />
                {categoryLabels[category as DocumentCategory]}
                <Badge className={`rounded-full ${categoryColors[category as DocumentCategory]}`}>
                  {docs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {docs.map(doc => (
                <Card key={doc.id} className="overflow-hidden border-[#133C2A]/10 bg-white/95 shadow-[0_8px_24px_rgba(19,60,42,0.05)]">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F8F4E3] text-xl">
                        {fileTypeIcons[(doc.fileType ?? '').toLowerCase()] || '📄'}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button type="button" onClick={() => setViewDocument(doc)} className="min-w-0 truncate text-left text-lg text-[#133C2A] hover:underline">
                              {doc.name ?? 'Без названия'}
                            </button>
                            {doc.description && (
                              <p className="mt-1 text-sm text-[#133C2A]/60 line-clamp-2">{doc.description}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleDownload(doc)} className="h-9 rounded-xl border-[#133C2A]/15 px-3">
                              <Download className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 rounded-xl border-[#133C2A]/15 px-3">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="rounded-xl">
                                <DropdownMenuItem onSelect={() => setViewDocument(doc)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Открыть
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => setEditDocument(doc)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Изменить
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onDeleteDocument(doc.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#133C2A]/60">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {doc.fileName}
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Создан: {formatDate(doc.createdAt)}
                          </span>
                          {doc.updatedAt && new Date(doc.updatedAt).getTime() !== new Date(doc.createdAt).getTime() && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-[#8B6B00]">
                                <Calendar className="w-3 h-3" />
                                Обновлен: {formatDate(doc.updatedAt)}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {doc.createdByName}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="rounded-full text-xs border-[#133C2A]/20">
                            {getEmployeeNames(doc.assignedEmployees)}
                          </Badge>
                          {doc.tags && doc.tags.length > 0 && doc.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="rounded-full text-xs border-[#D4AF37]/30 text-[#8B6B00] bg-[#FFF9E8]">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Add Document Dialog */}
      {showAddDialog && (
        <AddDocumentDialog
          employees={employees}
          parents={parents}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setShowAddDialog(false)}
          onAdd={onAddDocument}
        />
      )}

      {/* View Document Dialog */}
      {viewDocument && (
        <ViewDocumentDialog
          document={viewDocument}
          employees={employees}
          onClose={() => setViewDocument(null)}
          onDownload={() => handleDownload(viewDocument)}
        />
      )}

      {/* Edit Document Dialog */}
      {editDocument && (
        <EditDocumentDialog
          document={editDocument}
          employees={employees}
          parents={parents}
          onClose={() => setEditDocument(null)}
          onSave={onUpdateDocument}
        />
      )}
    </div>
  );
}