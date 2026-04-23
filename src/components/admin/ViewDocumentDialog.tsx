import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, FileText, Calendar, User, Tag } from 'lucide-react';
import { Document, User as UserType } from '../../types';

interface ViewDocumentDialogProps {
  document: Document;
  employees: UserType[];
  onClose: () => void;
  onDownload: () => void;
}

const categoryLabels: Record<string, string> = {
  contract: 'Договоры',
  policy: 'Политики и правила',
  instruction: 'Инструкции',
  template: 'Шаблоны',
  certificate: 'Сертификаты и лицензии',
  report: 'Отчеты',
  other: 'Прочее',
};

const categoryColors: Record<string, string> = {
  contract: 'bg-blue-50 text-blue-600 border-blue-200',
  policy: 'bg-purple-50 text-purple-600 border-purple-200',
  instruction: 'bg-green-50 text-green-600 border-green-200',
  template: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  certificate: 'bg-pink-50 text-pink-600 border-pink-200',
  report: 'bg-orange-50 text-orange-600 border-orange-200',
  other: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function ViewDocumentDialog({ document, employees, onClose, onDownload }: ViewDocumentDialogProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmployeeNames = (employeeIds: string[]): string[] => {
    if (employeeIds.length === 0) return ['Все сотрудники'];
    return employeeIds
      .map(id => employees.find(e => e.id === id)?.name)
      .filter(Boolean) as string[];
  };

  const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(document.fileType.toLowerCase());
  const isPdf = document.fileType.toLowerCase() === 'pdf';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            {document.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="border border-[#133C2A]/20 rounded-2xl overflow-hidden bg-[#F8F4E3]/30">
            {isImage ? (
              <img 
                src={document.fileUrl} 
                alt={document.name}
                className="w-full max-h-96 object-contain"
              />
            ) : isPdf ? (
              <div className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]" />
                <p className="text-[#133C2A] mb-2">PDF документ</p>
                <p className="text-sm text-[#133C2A]/60">
                  Нажмите "Скачать" для просмотра документа
                </p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]" />
                <p className="text-[#133C2A] mb-2">{document.fileName}</p>
                <p className="text-sm text-[#133C2A]/60">
                  Предпросмотр недоступен для данного типа файла
                </p>
              </div>
            )}
          </div>

          {/* Document Info */}
          <div className="space-y-3">
            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#133C2A]/60 w-32">Категория:</span>
              <Badge className={categoryColors[document.category]}>
                {categoryLabels[document.category]}
              </Badge>
            </div>

            {/* Description */}
            {document.description && (
              <div className="flex gap-2">
                <span className="text-sm text-[#133C2A]/60 w-32 flex-shrink-0">Описание:</span>
                <p className="text-sm text-[#133C2A]">{document.description}</p>
              </div>
            )}

            {/* File Info */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#133C2A]/60 w-32">Файл:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#133C2A]">{document.fileName}</span>
                <Badge variant="outline" className="text-xs">
                  {document.fileType.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatFileSize(document.fileSize)}
                </Badge>
              </div>
            </div>

            {/* Created By */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#133C2A]/60 w-32">Создатель:</span>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm text-[#133C2A]">{document.createdByName}</span>
              </div>
            </div>

            {/* Created At */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#133C2A]/60 w-32">Дата создания:</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-sm text-[#133C2A]">{formatDate(document.createdAt)}</span>
              </div>
            </div>

            {/* Assigned Employees */}
            <div className="flex gap-2">
              <span className="text-sm text-[#133C2A]/60 w-32 flex-shrink-0">Доступ:</span>
              <div className="flex flex-wrap gap-2">
                {getEmployeeNames(document.assignedEmployees).map((name, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex gap-2">
                <span className="text-sm text-[#133C2A]/60 w-32 flex-shrink-0">Теги:</span>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag, idx) => (
                    <Badge key={idx} className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30 text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl border-[#133C2A]/20"
            >
              Закрыть
            </Button>
            <Button
              onClick={onDownload}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}