import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Upload, X, FileText, Plus } from 'lucide-react';
import { Document, DocumentCategory, DocumentAccessType, User } from '../../types';

interface AddDocumentDialogProps {
  employees: User[];
  parents: User[];
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
  onAdd: (document: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>) => void;
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

const accessTypeLabels: Record<DocumentAccessType, string> = {
  all: 'Доступен всем',
  employees: 'Только сотрудникам',
  parents: 'Только родителям',
  specific: 'Выбранным пользователям',
};

export function AddDocumentDialog({ 
  employees, 
  parents,
  currentUserId,
  currentUserName,
  onClose, 
  onAdd 
}: AddDocumentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for separate access controls
  const [employeeAccess, setEmployeeAccess] = useState<'none' | 'all' | 'specific'>('all');
  const [parentAccess, setParentAccess] = useState<'none' | 'all' | 'specific'>('none');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Проверка размера файла (максимум 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 10MB');
        return;
      }
      setFile(selectedFile);
      // Автоматически заполняем название, если оно пустое
      if (!name) {
        setName(selectedFile.name.replace(/\.[^/.]+$/, '')); // Убираем расширение
      }
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleEmployee = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const toggleParent = (parentId: string) => {
    if (selectedParents.includes(parentId)) {
      setSelectedParents(selectedParents.filter(id => id !== parentId));
    } else {
      setSelectedParents([...selectedParents, parentId]);
    }
  };

  const toggleAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(e => e.id));
    }
  };

  const toggleAllParents = () => {
    if (selectedParents.length === parents.length) {
      setSelectedParents([]);
    } else {
      setSelectedParents(parents.map(p => p.id));
    }
  };

  const allEmployeesSelected = employees.length > 0 && selectedEmployees.length === employees.length;
  const allParentsSelected = parents.length > 0 && selectedParents.length === parents.length;

  // Handle employee access change
  const handleEmployeeAccessChange = (value: 'none' | 'all' | 'specific') => {
    setEmployeeAccess(value);
    if (value === 'all') {
      setSelectedEmployees(employees.map(e => e.id));
    } else if (value === 'none') {
      setSelectedEmployees([]);
    }
  };

  // Handle parent access change
  const handleParentAccessChange = (value: 'none' | 'all' | 'specific') => {
    setParentAccess(value);
    if (value === 'all') {
      setSelectedParents(parents.map(p => p.id));
    } else if (value === 'none') {
      setSelectedParents([]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Введите название документа');
      return;
    }

    if (!file) {
      alert('Выберите файл для загрузки');
      return;
    }

    setIsUploading(true);

    // В реальном приложении здесь будет загрузка файла на сервер
    // Для демо создаем data URL
    const reader = new FileReader();
    reader.onload = () => {
      const fileUrl = reader.result as string;
      const fileType = file.name.split('.').pop() || '';

      // Determine accessType based on employee and parent access
      let finalAccessType: DocumentAccessType = 'all';
      if (employeeAccess === 'none' && parentAccess === 'none') {
        finalAccessType = 'specific'; // No access
      } else if (employeeAccess !== 'none' && parentAccess === 'none') {
        finalAccessType = 'employees';
      } else if (employeeAccess === 'none' && parentAccess !== 'none') {
        finalAccessType = 'parents';
      } else if (employeeAccess === 'all' && parentAccess === 'all') {
        finalAccessType = 'all';
      } else {
        finalAccessType = 'specific';
      }

      const newDocument: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        fileUrl,
        accessType: finalAccessType,
        assignedEmployees: employeeAccess !== 'none' ? selectedEmployees : [],
        assignedParents: parentAccess !== 'none' ? selectedParents : [],
        createdBy: currentUserId,
        createdByName: currentUserName,
        tags: tags.length > 0 ? tags : undefined,
      };

      onAdd(newDocument);
      setIsUploading(false);
      onClose();
    };

    reader.readAsDataURL(file);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A]">Добавить документ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <Label className="text-[#133C2A]">Файл *</Label>
            <div className="mt-2">
              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 border-2 border-dashed border-[#133C2A]/20 rounded-2xl hover:border-[#D4AF37] transition-smooth bg-[#F8F4E3]/30 hover:bg-[#F8F4E3]"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-[#D4AF37]" />
                  <p className="text-[#133C2A] mb-1">Нажмите для выбора файла</p>
                  <p className="text-xs text-[#133C2A]/60">
                    Поддерживаются: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP (макс. 10MB)
                  </p>
                </button>
              ) : (
                <div className="p-4 border border-[#133C2A]/20 rounded-2xl bg-[#F8F4E3] flex items-center gap-3">
                  <FileText className="w-8 h-8 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#133C2A] truncate">{file.name}</p>
                    <p className="text-xs text-[#133C2A]/60">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFile(null)}
                    className="rounded-xl hover:bg-red-50"
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar,.txt"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-[#133C2A]">Название документа *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Договор оказания услуг"
              className="mt-2 rounded-xl border-[#133C2A]/20"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-[#133C2A]">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание документа..."
              className="mt-2 rounded-xl border-[#133C2A]/20 min-h-[80px]"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" className="text-[#133C2A]">Категория *</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full mt-2 rounded-xl border-[#133C2A]/20 p-2 bg-white"
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Employee Access */}
          <div>
            <Label htmlFor="employeeAccess" className="text-[#133C2A]">Доступ для сотрудников</Label>
            <select
              id="employeeAccess"
              value={employeeAccess}
              onChange={(e) => handleEmployeeAccessChange(e.target.value as 'none' | 'all' | 'specific')}
              className="w-full mt-2 rounded-xl border-[#133C2A]/20 p-2 bg-white"
            >
              <option value="none">Нет доступа</option>
              <option value="all">Доступ всем сотрудникам</option>
              <option value="specific">Выбранным сотрудникам</option>
            </select>

            {/* Employees Selection */}
            {employeeAccess === 'specific' && (
              <div className="mt-2 p-4 border border-[#133C2A]/20 rounded-2xl bg-[#F8F4E3]/30 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {employees.map(employee => (
                    <label
                      key={employee.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-xl transition-smooth"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        className="rounded border-[#133C2A]/20"
                      />
                      <span className="text-sm text-[#133C2A]">{employee.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {employee.role === 'admin' ? 'Администратор' : 'Преподаватель'}
                      </Badge>
                    </label>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#133C2A]/10">
                  <Button
                    type="button"
                    onClick={toggleAllEmployees}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    {allEmployeesSelected ? 'Снять выбор' : 'Выбрать всех'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Parent Access */}
          <div>
            <Label htmlFor="parentAccess" className="text-[#133C2A]">Доступ для родителей</Label>
            <select
              id="parentAccess"
              value={parentAccess}
              onChange={(e) => handleParentAccessChange(e.target.value as 'none' | 'all' | 'specific')}
              className="w-full mt-2 rounded-xl border-[#133C2A]/20 p-2 bg-white"
            >
              <option value="none">Нет доступа</option>
              <option value="all">Доступ всем родителям</option>
              <option value="specific">Выбранным родителям</option>
            </select>

            {/* Parents Selection */}
            {parentAccess === 'specific' && (
              <div className="mt-2 p-4 border border-[#133C2A]/20 rounded-2xl bg-[#F8F4E3]/30 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {parents.map(parent => (
                    <label
                      key={parent.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-xl transition-smooth"
                    >
                      <input
                        type="checkbox"
                        checked={selectedParents.includes(parent.id)}
                        onChange={() => toggleParent(parent.id)}
                        className="rounded border-[#133C2A]/20"
                      />
                      <span className="text-sm text-[#133C2A] flex-1">{parent.name}</span>
                      <span className="text-xs text-[#133C2A]/60">{parent.phone}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#133C2A]/10">
                  <Button
                    type="button"
                    onClick={toggleAllParents}
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    {allParentsSelected ? 'Снять выбор' : 'Выбрать всех'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label className="text-[#133C2A]">Теги</Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Добавить тег..."
                className="flex-1 rounded-xl border-[#133C2A]/20"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                className="rounded-xl border-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag, idx) => (
                  <Badge key={idx} className="bg-[#D4AF37]/20 text-[#133C2A] border-[#D4AF37]/30">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl border-[#133C2A]/20"
              disabled={isUploading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
              disabled={isUploading || !name.trim() || !file}
            >
              {isUploading ? 'Загрузка...' : 'Добавить документ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}