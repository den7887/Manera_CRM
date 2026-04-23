import { Avatar, AvatarFallback } from '../ui/avatar';
import { mockGroups, mockPricingProducts } from '../../data/mockData';
import { toast } from '../../utils/toast';

interface Client {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  students: {
    id: string;
    name: string;
    age: number;
    birthDate: string;
    groupIds: string[];
    subscriptionId: string | null;
    medicalRestrictions?: string;
  }[];
  source: string;
  status: 'active' | 'inactive' | 'trial' | 'frozen';
  registrationDate: string;
  lastVisit?: string;
  totalSpent: number;
  notes?: string;
  address?: string;
}

export function ClientsManagement() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      parentName: 'Елена Смирнова',
      parentPhone: '+7 (999) 123-45-67',
      parentEmail: 'elena.s@example.com',
      students: [
        {
          id: 's1',
          name: 'Катя Смирнова',
          age: 8,
          birthDate: '2016-05-15',
          groupIds: ['1'],
          subscriptionId: '1',
          medicalRestrictions: 'Нет',
        },
      ],
      source: 'Instagram',
      status: 'active',
      registrationDate: '2024-01-15',
      lastVisit: '2024-11-15',
      totalSpent: 24000,
      address: 'г. Москва, ул. Ленина, 10',
    },
    {
      id: '2',
      parentName: 'Андрей Петров',
      parentPhone: '+7 (999) 234-56-78',
      parentEmail: 'andrey.p@example.com',
      students: [
        {
          id: 's2',
          name: 'Максим Петров',
          age: 10,
          birthDate: '2014-08-22',
          groupIds: ['2'],
          subscriptionId: '2',
        },
      ],
      source: 'Рекомендация',
      status: 'active',
      registrationDate: '2024-02-20',
      lastVisit: '2024-11-14',
      totalSpent: 18000,
      notes: 'Активный клиент, всегда вовремя',
    },
    {
      id: '3',
      parentName: 'Мария Иванова',
      parentPhone: '+7 (999) 345-67-89',
      parentEmail: 'maria.i@example.com',
      students: [
        {
          id: 's3',
          name: 'София Иванова',
          age: 7,
          birthDate: '2017-03-10',
          groupIds: ['1'],
          subscriptionId: null,
        },
      ],
      source: 'Google',
      status: 'trial',
      registrationDate: '2024-11-01',
      totalSpent: 0,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Новый клиент форма
  const [newClient, setNewClient] = useState({
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    studentName: '',
    studentAge: '',
    studentBirthDate: '',
    source: '',
    medicalRestrictions: '',
    address: '',
    notes: '',
  });

  const statusColors = {
    active: 'bg-green-500/10 text-green-700 border-green-200',
    inactive: 'bg-gray-500/10 text-gray-700 border-gray-200',
    trial: 'bg-blue-500/10 text-blue-700 border-blue-200',
    frozen: 'bg-orange-500/10 text-orange-700 border-orange-200',
  };

  const statusLabels = {
    active: 'Активен',
    inactive: 'Неактивен',
    trial: 'Пробный',
    frozen: 'Заморожен',
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.parentPhone.includes(searchQuery) ||
      client.parentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.students.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddClient = () => {
    const client: Client = {
      id: `client-${Date.now()}`,
      parentName: newClient.parentName,
      parentPhone: newClient.parentPhone,
      parentEmail: newClient.parentEmail,
      students: [
        {
          id: `student-${Date.now()}`,
          name: newClient.studentName,
          age: parseInt(newClient.studentAge),
          birthDate: newClient.studentBirthDate,
          groupIds: [],
          subscriptionId: null,
          medicalRestrictions: newClient.medicalRestrictions || 'Нет',
        },
      ],
      source: newClient.source,
      status: 'trial',
      registrationDate: new Date().toISOString().split('T')[0],
      totalSpent: 0,
      address: newClient.address,
      notes: newClient.notes,
    };

    setClients([...clients, client]);
    setIsAddDialogOpen(false);
    setNewClient({
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      studentName: '',
      studentAge: '',
      studentBirthDate: '',
      source: '',
      medicalRestrictions: '',
      address: '',
      notes: '',
    });
    toast.success('Клиент успешно добавлен!');
  };

  const stats = {
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    trial: clients.filter(c => c.status === 'trial').length,
    revenue: clients.reduce((sum, c) => sum + c.totalSpent, 0),
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Всего клиентов</p>
                <p className="text-3xl text-[#133C2A]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#133C2A] to-[#1C8C64] flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Активные</p>
                <p className="text-3xl text-[#133C2A]">{stats.active}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Пробные</p>
                <p className="text-3xl text-[#133C2A]">{stats.trial}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none soft-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#133C2A]/60 mb-1">Общая выручка</p>
                <p className="text-3xl text-[#133C2A]">{stats.revenue.toLocaleString()} ₽</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#133C2A] flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Основная карточка */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2 text-[#133C2A]">
              <Users className="w-6 h-6" />
              Управление клиентами
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Добавить клиента
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-[#133C2A]">Новый клиент</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-sm text-[#133C2A]/60">Информация о родителе</h3>
                    
                    <div className="space-y-2">
                      <Label>ФИО родителя *</Label>
                      <Input
                        value={newClient.parentName}
                        onChange={(e) => setNewClient({ ...newClient, parentName: e.target.value })}
                        placeholder="Иванов Иван Иванович"
                        className="rounded-2xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Телефон *</Label>
                        <Input
                          value={newClient.parentPhone}
                          onChange={(e) => setNewClient({ ...newClient, parentPhone: e.target.value })}
                          placeholder="+7 (999) 123-45-67"
                          className="rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newClient.parentEmail}
                          onChange={(e) => setNewClient({ ...newClient, parentEmail: e.target.value })}
                          placeholder="example@mail.ru"
                          className="rounded-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Адрес</Label>
                      <Input
                        value={newClient.address}
                        onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                        placeholder="г. Москва, ул. Ленина, 10"
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm text-[#133C2A]/60">Информация о ребёнке</h3>
                    
                    <div className="space-y-2">
                      <Label>ФИО ребёнка *</Label>
                      <Input
                        value={newClient.studentName}
                        onChange={(e) => setNewClient({ ...newClient, studentName: e.target.value })}
                        placeholder="Иванов Петр"
                        className="rounded-2xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Возраст *</Label>
                        <Input
                          type="number"
                          value={newClient.studentAge}
                          onChange={(e) => setNewClient({ ...newClient, studentAge: e.target.value })}
                          placeholder="8"
                          className="rounded-2xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Дата рождения *</Label>
                        <Input
                          type="date"
                          value={newClient.studentBirthDate}
                          onChange={(e) => setNewClient({ ...newClient, studentBirthDate: e.target.value })}
                          className="rounded-2xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Медицинские ограничения</Label>
                      <Textarea
                        value={newClient.medicalRestrictions}
                        onChange={(e) => setNewClient({ ...newClient, medicalRestrictions: e.target.value })}
                        placeholder="Укажите медицинские ограничения, если есть"
                        className="rounded-2xl min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm text-[#133C2A]/60">Дополнительно</h3>
                    
                    <div className="space-y-2">
                      <Label>Источник</Label>
                      <Select value={newClient.source} onValueChange={(value) => setNewClient({ ...newClient, source: value })}>
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Откуда узнали о нас?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="friends">Рекомендация друзей</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                          <SelectItem value="yandex">Яндекс</SelectItem>
                          <SelectItem value="ads">Реклама</SelectItem>
                          <SelectItem value="passing">Проходил мимо</SelectItem>
                          <SelectItem value="other">Другое</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Примечания</Label>
                      <Textarea
                        value={newClient.notes}
                        onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                        placeholder="Дополнительная информация"
                        className="rounded-2xl min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddClient}
                      disabled={!newClient.parentName || !newClient.parentPhone || !newClient.studentName || !newClient.studentAge || !newClient.studentBirthDate}
                      className="flex-1 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]"
                    >
                      Добавить клиента
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      className="rounded-2xl"
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Филь��ры и поиск */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#133C2A]/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени, телефону, email..."
                className="pl-10 rounded-2xl border-[#133C2A]/20"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] rounded-2xl border-[#133C2A]/20">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="trial">Пробные</SelectItem>
                <SelectItem value="frozen">Замороженные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Список клиентов */}
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="border-[#133C2A]/10 hover-lift transition-smooth">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 border-2 border-[#D4AF37]/20">
                      <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                        {client.parentName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-[#133C2A] mb-1">{client.parentName}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-[#133C2A]/60">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.parentPhone}
                            </span>
                            {client.parentEmail && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {client.parentEmail}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={`${statusColors[client.status]} border`}>
                          {statusLabels[client.status]}
                        </Badge>
                      </div>

                      {/* Ученики */}
                      <div className="space-y-2 mb-3">
                        {client.students.map((student) => (
                          <div key={student.id} className="flex items-center gap-2 text-sm">
                            <Baby className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-[#133C2A]">{student.name}</span>
                            <span className="text-[#133C2A]/60">({student.age} лет)</span>
                            {student.groupIds.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {student.groupIds.length} {student.groupIds.length === 1 ? 'группа' : 'групп'}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Метаданные */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#133C2A]/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          С {new Date(client.registrationDate).toLocaleDateString('ru')}
                        </span>
                        {client.lastVisit && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Последний визит: {new Date(client.lastVisit).toLocaleDateString('ru')}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />
                          Потрачено: {client.totalSpent.toLocaleString()} ₽
                        </span>
                        <span>•</span>
                        <span className="text-[#D4AF37]">{client.source}</span>
                      </div>
                    </div>

                    {/* Действия */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClient(client);
                          setIsViewDialogOpen(true);
                        }}
                        className="rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredClients.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-[#133C2A]/20 mx-auto mb-4" />
                <p className="text-[#133C2A]/60">Клиенты не найдены</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Диалог просмотра клиента */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          {selectedClient && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#133C2A] flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-[#D4AF37]/20">
                    <AvatarFallback className="bg-gradient-to-br from-[#133C2A] to-[#D4AF37] text-white">
                      {selectedClient.parentName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {selectedClient.parentName}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="info" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-[#F8F4E3]">
                  <TabsTrigger value="info" className="rounded-xl">Информация</TabsTrigger>
                  <TabsTrigger value="students" className="rounded-xl">Дети</TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl">История</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-6">
                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#133C2A]/60">Контактная информация</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-[#D4AF37]" />
                        <div>
                          <p className="text-xs text-[#133C2A]/60">Телефон</p>
                          <p className="text-[#133C2A]">{selectedClient.parentPhone}</p>
                        </div>
                      </div>
                      {selectedClient.parentEmail && (
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-[#D4AF37]" />
                          <div>
                            <p className="text-xs text-[#133C2A]/60">Email</p>
                            <p className="text-[#133C2A]">{selectedClient.parentEmail}</p>
                          </div>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div className="flex items-center gap-3">
                          <MapPin className="w-5 h-5 text-[#D4AF37]" />
                          <div>
                            <p className="text-xs text-[#133C2A]/60">Адрес</p>
                            <p className="text-[#133C2A]">{selectedClient.address}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-[#133C2A]/10">
                    <CardHeader>
                      <CardTitle className="text-sm text-[#133C2A]/60">Статус и активность</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#133C2A]/60">Статус</span>
                        <Badge className={`${statusColors[selectedClient.status]} border`}>
                          {statusLabels[selectedClient.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#133C2A]/60">Дата регистрации</span>
                        <span className="text-[#133C2A]">
                          {new Date(selectedClient.registrationDate).toLocaleDateString('ru')}
                        </span>
                      </div>
                      {selectedClient.lastVisit && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#133C2A]/60">Последний визит</span>
                          <span className="text-[#133C2A]">
                            {new Date(selectedClient.lastVisit).toLocaleDateString('ru')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#133C2A]/60">Источник</span>
                        <span className="text-[#D4AF37]">{selectedClient.source}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#133C2A]/60">Всего потрачено</span>
                        <span className="text-[#133C2A]">
                          {selectedClient.totalSpent.toLocaleString()} ₽
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedClient.notes && (
                    <Card className="border-[#133C2A]/10">
                      <CardHeader>
                        <CardTitle className="text-sm text-[#133C2A]/60">Примечания</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-[#133C2A]/80">{selectedClient.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="students" className="space-y-4">
                  {selectedClient.students.map((student) => (
                    <Card key={student.id} className="border-[#133C2A]/10">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3 mb-4">
                          <Avatar className="w-10 h-10 border-2 border-[#D4AF37]/20">
                            <AvatarFallback className="bg-gradient-to-br from-[#FADADD] to-[#FFC0CB] text-[#133C2A]">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="text-[#133C2A] mb-1">{student.name}</h3>
                            <p className="text-sm text-[#133C2A]/60">
                              {student.age} лет • {new Date(student.birthDate).toLocaleDateString('ru')}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-[#133C2A]/60 mb-1">Группы</p>
                            {student.groupIds.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {student.groupIds.map((groupId) => {
                                  const group = mockGroups.find(g => g.id === groupId);
                                  return (
                                    <Badge key={groupId} variant="outline" className="border-[#D4AF37]">
                                      {group?.name || groupId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-[#133C2A]/40">Не назначены</p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs text-[#133C2A]/60 mb-1">Абонемент</p>
                            {student.subscriptionId ? (
                              <Badge className="bg-green-500/10 text-green-700 border-green-200">
                                {mockPricingProducts.find(s => s.id === student.subscriptionId)?.name || 'Активен'}
                              </Badge>
                            ) : (
                              <p className="text-sm text-[#133C2A]/40">Нет активного</p>
                            )}
                          </div>

                          {student.medicalRestrictions && student.medicalRestrictions !== 'Нет' && (
                            <div>
                              <p className="text-xs text-[#133C2A]/60 mb-1">Медицинские ограничения</p>
                              <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 border border-orange-200">
                                <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-orange-800">{student.medicalRestrictions}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card className="border-[#133C2A]/10">
                    <CardContent className="p-6">
                      <p className="text-center text-[#133C2A]/60">
                        История транзакций и посещений появится здесь
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}