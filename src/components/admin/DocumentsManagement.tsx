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
  ClipboardCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Document, DocumentCategory, User as UserType } from '../../types';
import { AddDocumentDialog } from './AddDocumentDialog';
import { ViewDocumentDialog } from './ViewDocumentDialog';
import { EditDocumentDialog } from './EditDocumentDialog';

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
  contract: 'bg-blue-50 text-blue-600 border-blue-200',
  policy: 'bg-purple-50 text-purple-600 border-purple-200',
  instruction: 'bg-green-50 text-green-600 border-green-200',
  template: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  certificate: 'bg-pink-50 text-pink-600 border-pink-200',
  report: 'bg-orange-50 text-orange-600 border-orange-200',
  checklist: 'bg-teal-50 text-teal-600 border-teal-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
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
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#133C2A] mb-2">Документация</h1>
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

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Всего документов</p>
                <p className="text-2xl text-[#133C2A]">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Категорий</p>
                <p className="text-2xl text-[#133C2A]">{Object.keys(documentsByCategory).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Сотрудников</p>
                <p className="text-2xl text-[#133C2A]">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Загружено сегодня</p>
                <p className="text-2xl text-[#133C2A]">
                  {documents.filter(d => {
                    const today = new Date();
                    const docDate = new Date(d.createdAt);
                    return docDate.toDateString() === today.toDateString();
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#133C2A]/30" />
            <p className="text-[#133C2A]/60 mb-2">Документы не найдены</p>
            <p className="text-sm text-[#133C2A]/40">
              Попробуйте изменить параметры поиска или добавьте новый документ
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(documentsByCategory).map(([category, docs]) => (
          <Card key={category} className="border-none soft-shadow">
            <CardHeader>
              <CardTitle className="text-[#133C2A] flex items-center gap-2">
                <FileType className="w-5 h-5 text-[#D4AF37]" />
                {categoryLabels[category as DocumentCategory]}
                <Badge className={categoryColors[category as DocumentCategory]}>
                  {docs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                  >
                    <div className="flex items-start gap-4">
                      {/* File Icon */}
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl flex-shrink-0">
                        {fileTypeIcons[doc.fileType.toLowerCase()] || '📄'}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h4 className="text-[#133C2A] mb-1">{doc.name}</h4>
                            {doc.description && (
                              <p className="text-sm text-[#133C2A]/60 line-clamp-2">
                                {doc.description}
                              </p>
                            )}
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
                              <span className="flex items-center gap-1 text-[#D4AF37]">
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

                        {/* Assigned Employees */}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-[#133C2A]/20">
                            {getEmployeeNames(doc.assignedEmployees)}
                          </Badge>
                        </div>

                        {/* Tags */}
                        {doc.tags && doc.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {doc.tags.map((tag, idx) => (
                              <Badge key={idx} className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30 text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewDocument(doc)}
                          className="rounded-xl hover:bg-white/50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="rounded-xl hover:bg-white/50"
                        >
                          <Download className="w-4 h-4 text-[#D4AF37]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditDocument(doc)}
                          className="rounded-xl hover:bg-white/50"
                        >
                          <Edit className="w-4 h-4 text-[#D4AF37]" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteDocument(doc.id)}
                          className="rounded-xl hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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