import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { FileText, Search, Download, Eye, Calendar, Tag, Plus, CheckSquare } from 'lucide-react';
import { Document, User } from '../../types';
import { ViewDocumentDialog } from '../admin/ViewDocumentDialog';
import { CreateChecklistDialog } from './CreateChecklistDialog';

interface TeacherDocumentsProps {
  documents: Document[];
  currentUserId: string;
  currentUserName: string;
  onAddDocument: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const categoryColors = {
  checklist: 'bg-teal-50 text-teal-600 border-teal-200',
  instruction: 'bg-green-50 text-green-600 border-green-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

const fileTypeIcons: Record<string, string> = {
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  checklist: '✅',
};

export function TeacherDocuments({ 
  documents, 
  currentUserId,
  currentUserName,
  onAddDocument 
}: TeacherDocumentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [showCreateChecklist, setShowCreateChecklist] = useState(false);

  // Фильтр документов доступных преподавателю
  const availableDocuments = documents.filter(doc => {
    const hasAccess = doc.accessType === 'all' || 
                     doc.accessType === 'employees' ||
                     (doc.accessType === 'specific' && doc.assignedEmployees.includes(currentUserId)) ||
                     doc.createdBy === currentUserId; // Преподаватель видит свои документы
    return hasAccess;
  });

  // Поиск
  const filteredDocuments = availableDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Мои чек-листы
  const myChecklists = filteredDocuments.filter(doc => 
    doc.category === 'checklist' && doc.createdBy === currentUserId
  );

  // Доступные документы (не чек-листы)
  const otherDocuments = filteredDocuments.filter(doc => 
    doc.category !== 'checklist'
  );

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

  const renderDocument = (doc: Document) => (
    <div
      key={doc.id}
      className="p-4 rounded-2xl bg-[#F8F4E3] hover:bg-[#F8F4E3]/70 transition-smooth"
    >
      <div className="flex items-start gap-4">
        {/* File Icon */}
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl flex-shrink-0">
          {doc.category === 'checklist' ? '✅' : (fileTypeIcons[doc.fileType.toLowerCase()] || '📄')}
        </div>

        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-[#133C2A]">{doc.name}</h4>
            {doc.createdBy === currentUserId && (
              <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30 text-xs">
                Мой
              </Badge>
            )}
          </div>
          
          {doc.description && (
            <p className="text-sm text-[#133C2A]/60 mb-2 line-clamp-2">
              {doc.description}
            </p>
          )}

          {/* Checklist Items Preview */}
          {doc.category === 'checklist' && doc.checklistItems && (
            <div className="mt-2 p-3 bg-white rounded-xl">
              <p className="text-xs text-[#133C2A]/60 mb-2">
                Элементов чек-листа: {doc.checklistItems.length}
              </p>
              <div className="space-y-1">
                {doc.checklistItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-[#133C2A]">
                    <CheckSquare className="w-3 h-3 text-[#D4AF37]" />
                    <span className="line-clamp-1">{item}</span>
                  </div>
                ))}
                {doc.checklistItems.length > 3 && (
                  <p className="text-xs text-[#133C2A]/60 mt-1">
                    +{doc.checklistItems.length - 3} еще...
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#133C2A]/60 mt-2">
            {doc.category !== 'checklist' && (
              <>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {doc.fileName}
                </span>
                <span>•</span>
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>•</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(doc.createdAt)}
            </span>
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
          {doc.category !== 'checklist' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(doc)}
              className="rounded-xl hover:bg-white/50"
            >
              <Download className="w-4 h-4 text-[#D4AF37]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-[#133C2A] mb-2">Документы</h1>
          <p className="text-[#133C2A]/60">
            Документы и чек-листы для работы
          </p>
        </div>
        <Button
          onClick={() => setShowCreateChecklist(true)}
          className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Создать чек-лист
        </Button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Мои чек-листы</p>
                <p className="text-2xl text-[#133C2A]">{myChecklists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8941F] flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Доступно документов</p>
                <p className="text-2xl text-[#133C2A]">{otherDocuments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#133C2A]/60">Создано за месяц</p>
                <p className="text-2xl text-[#133C2A]">
                  {myChecklists.filter(d => {
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
        <CardContent className="p-4">
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

      {/* My Checklists */}
      {myChecklists.length > 0 && (
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-teal-600" />
              Мои чек-листы
              <Badge className="bg-teal-50 text-teal-600 border-teal-200">
                {myChecklists.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myChecklists.map(renderDocument)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Documents */}
      {otherDocuments.length > 0 && (
        <Card className="border-none soft-shadow">
          <CardHeader>
            <CardTitle className="text-[#133C2A] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4AF37]" />
              Доступные документы
              <Badge className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
                {otherDocuments.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherDocuments.map(renderDocument)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredDocuments.length === 0 && (
        <Card className="border-none soft-shadow">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#133C2A]/30" />
            <p className="text-[#133C2A]/60 mb-2">Документы не найдены</p>
            <p className="text-sm text-[#133C2A]/40 mb-4">
              Создайте свой первый чек-лист или подождите, пока администратор предоставит доступ к документам
            </p>
            <Button
              onClick={() => setShowCreateChecklist(true)}
              variant="outline"
              className="rounded-xl border-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Создать чек-лист
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Checklist Dialog */}
      {showCreateChecklist && (
        <CreateChecklistDialog
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setShowCreateChecklist(false)}
          onAdd={onAddDocument}
        />
      )}

      {/* View Document Dialog */}
      {viewDocument && (
        <ViewDocumentDialog
          document={viewDocument}
          employees={[]}
          onClose={() => setViewDocument(null)}
          onDownload={() => viewDocument.category !== 'checklist' && handleDownload(viewDocument)}
        />
      )}
    </div>
  );
}
