import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { X, Plus, Upload, FileText } from 'lucide-react';
import { Document, DocumentCategory, DocumentAccessType, User } from '../../types';

interface EditDocumentDialogProps {
  document: Document;
  employees: User[];
  parents: User[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<Document>) => void;
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

export function EditDocumentDialog({ document, employees, parents, onClose, onSave }: EditDocumentDialogProps) {
  const [name, setName] = useState(document.name);
  const [description, setDescription] = useState(document.description || '');
  const [category, setCategory] = useState<DocumentCategory>(document.category);
  const [accessType, setAccessType] = useState<DocumentAccessType>(document.accessType);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(document.assignedEmployees);
  const [selectedParents, setSelectedParents] = useState<string[]>(document.assignedParents);
  const [tags, setTags] = useState<string[]>(document.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>(document.checklistItems || []);
  const [checklistInput, setChecklistInput] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for separate access controls
  const [employeeAccess, setEmployeeAccess] = useState<'none' | 'all' | 'specific'>(
    document.accessType === 'all' || document.accessType === 'employees' 
      ? (document.assignedEmployees.length > 0 && document.assignedEmployees.length < employees.length ? 'specific' : 'all')
      : 'none'
  );
  const [parentAccess, setParentAccess] = useState<'none' | 'all' | 'specific'>(
    document.accessType === 'all' || document.accessType === 'parents'
      ? (document.assignedParents.length > 0 && document.assignedParents.length < parents.length ? 'specific' : 'all')
      : 'none'
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Проверка размера файла (максимум 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер 10MB');
        return;
      }
      setNewFile(selectedFile);
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

  const handleAddChecklistItem = () => {
    if (checklistInput.trim()) {
      setChecklistItems([...checklistItems, checklistInput.trim()]);
      setChecklistInput('');
    }
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
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

    setIsUploading(true);

    const processUpdates = (fileData?: { fileUrl: string; fileName: string; fileType: string; fileSize: number }) => {
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

      const updates: Partial<Document> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        accessType: finalAccessType,
        assignedEmployees: employeeAccess !== 'none' ? selectedEmployees : [],
        assignedParents: parentAccess !== 'none' ? selectedParents : [],
        tags: tags.length > 0 ? tags : undefined,
        checklistItems: category === 'checklist' ? checklistItems : undefined,
        updatedAt: new Date(),
        ...fileData,
      };

      onSave(document.id, updates);
      setIsUploading(false);
      onClose();
    };

    // If new file is selected, process it
    if (newFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const fileUrl = reader.result as string;
        const fileType = newFile.name.split('.').pop() || '';
        
        processUpdates({
          fileUrl,
          fileName: newFile.name,
          fileType,
          fileSize: newFile.size,
        });
      };
      reader.readAsDataURL(newFile);
    } else {
      // No new file, just update other fields
      processUpdates();
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#133C2A]">Редактировать документ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* File Upload - Update Document */}
          <div>
            <Label className="text-[#133C2A]">Обновить файл документа</Label>
            <p className="text-xs text-[#133C2A]/60 mb-2">
              Текущий файл: {document.fileName} ({(document.fileSize / 1024).toFixed(1)} KB)
            </p>
            <div className="mt-2">
              {!newFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-dashed border-[#133C2A]/20 rounded-2xl hover:border-[#D4AF37] transition-smooth bg-[#F8F4E3]/30 hover:bg-[#F8F4E3]"
                >
                  <Upload className="w-6 h-6 mx-auto mb-2 text-[#D4AF37]" />
                  <p className="text-sm text-[#133C2A]">Нажмите для загрузки новой версии</p>
                  <p className="text-xs text-[#133C2A]/60 mt-1">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP (макс. 10MB)
                  </p>
                </button>
              ) : (
                <div className="p-4 border border-[#133C2A]/20 rounded-2xl bg-[#D4AF37]/10 flex items-center gap-3">
                  <FileText className="w-8 h-8 text-[#D4AF37] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#133C2A] truncate">{newFile.name}</p>
                    <p className="text-xs text-[#133C2A]/60">
                      {(newFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNewFile(null)}
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

          {/* Checklist Items (only if category is checklist) */}
          {category === 'checklist' && (
            <div>
              <Label className="text-[#133C2A]">Элементы чек-листа</Label>
              <div className="mt-2 space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-[#F8F4E3] rounded-xl">
                    <span className="flex-1 text-sm text-[#133C2A]">{idx + 1}. {item}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChecklistItem(idx)}
                      className="rounded-xl hover:bg-red-50"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={checklistInput}
                    onChange={(e) => setChecklistInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    placeholder="Добавить элемент..."
                    className="flex-1 rounded-xl border-[#133C2A]/20"
                  />
                  <Button
                    type="button"
                    onClick={handleAddChecklistItem}
                    variant="outline"
                    className="rounded-xl border-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

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
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90"
            >
              Сохранить изменения
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}