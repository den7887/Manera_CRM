import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FileText, Search, Download, Eye, Calendar, Tag } from 'lucide-react';
import { Document, DocumentCategory } from '../../types';
import { ViewDocumentDialog } from '../admin/ViewDocumentDialog';

interface ParentDocumentsProps {
  documents: Document[];
  currentUserId: string;
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

export function ParentDocuments({ documents, currentUserId }: ParentDocumentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDocument, setViewDocument] = useState<Document | null>(null);

  // Фильтр документов доступных родителю
  const availableDocuments = documents.filter(doc => {
    const hasAccess = doc.accessType === 'all' || 
                     doc.accessType === 'parents' ||
                     (doc.accessType === 'specific' && doc.assignedParents.includes(currentUserId));
    return hasAccess;
  });

  // Поиск
  const filteredDocuments = availableDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
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

  const handleDownload = (doc: Document) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.fileName;
    link.click();
  };

  return (
    <div className="space-y-4 animate-scale-in">
      {/* Header */}
      <div className="hidden md:block">
        <h2 className="text-[#133C2A] text-xl">Документы</h2>
        <p className="text-sm text-[#133C2A]/60">
          Документы, доступные для просмотра
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
        <Card className="border-none soft-shadow col-span-2 sm:col-span-1">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-[#133C2A]/60 md:text-sm">Доступно</p>
                <p className="text-xl text-[#133C2A] md:text-2xl">{availableDocuments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <Tag className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-[#133C2A]/60 md:text-sm">Категорий</p>
                <p className="text-xl text-[#133C2A] md:text-2xl">{Object.keys(documentsByCategory).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] text-[#133C2A]/60 md:text-sm">Новых</p>
                <p className="text-xl text-[#133C2A] md:text-2xl">
                  {availableDocuments.filter(d => {
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return new Date(d.createdAt) > monthAgo;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-none soft-shadow">
        <CardContent className="p-3 md:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#133C2A]/40" />
            <Input
              placeholder="Поиск по названию, описанию или тегам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-[#133C2A]/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents by Category */}
      {filteredDocuments.length === 0 ? (
        <Card className="border-none soft-shadow">
          <CardContent className="p-8 md:p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#133C2A]/30" />
            <p className="text-[#133C2A]/60 mb-2">Документы не найдены</p>
            <p className="text-sm text-[#133C2A]/40">
              {availableDocuments.length === 0 
                ? 'Вам пока не предоставлен доступ к документам'
                : 'Попробуйте изменить параметры поиска'}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(documentsByCategory).map(([category, docs]) => (
          <Card key={category} className="border-none soft-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-[#133C2A] flex items-center gap-2 flex-wrap text-base">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                {categoryLabels[category as DocumentCategory]}
                <Badge className={categoryColors[category as DocumentCategory]}>
                  {docs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {docs.map(doc => (
                  <div
                    key={doc.id}
                    className="p-3 md:p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      {/* File Icon */}
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0 md:w-12 md:h-12 md:text-2xl">
                        {fileTypeIcons[doc.fileType.toLowerCase()] || '📄'}
                      </div>

                      {/* Document Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[#133C2A] mb-1 line-clamp-2">{doc.name}</h4>
                        {doc.description && (
                          <p className="text-sm text-[#133C2A]/60 mb-2 line-clamp-2">
                            {doc.description}
                          </p>
                        )}

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
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>

                        {/* Checklist Items Preview */}
                        {doc.category === 'checklist' && doc.checklistItems && doc.checklistItems.length > 0 && (
                          <div className="mt-2 p-2 bg-white rounded-xl">
                            <p className="text-xs text-[#133C2A]/60 mb-1">Пунктов в чек-листе: {doc.checklistItems.length}</p>
                          </div>
                        )}

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
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-col sm:gap-1 md:flex-row md:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewDocument(doc)}
                          className="rounded-xl hover:bg-white/50"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sm:hidden">Открыть</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          className="rounded-xl hover:bg-white/50"
                        >
                          <Download className="w-4 h-4 text-[#D4AF37]" />
                          <span className="sm:hidden">Скачать</span>
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

      {/* View Document Dialog */}
      {viewDocument && (
        <ViewDocumentDialog
          document={viewDocument}
          employees={[]} // Родителям не нужно видеть список сотрудников
          onClose={() => setViewDocument(null)}
          onDownload={() => handleDownload(viewDocument)}
        />
      )}
    </div>
  );
}
