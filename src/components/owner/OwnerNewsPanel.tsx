import { useEffect, useMemo, useState } from 'react';
import { Edit, Megaphone, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { News } from '../../types';
import { createNews, deleteNews, loadNews, updateNews } from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';

const defaults = {
  id: '',
  title: '',
  content: '',
  published: true,
};

type PublishFilter = 'all' | 'published' | 'draft';

function toDate(value: Date): number {
  return new Date(value).getTime();
}

export function OwnerNewsPanel() {
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(defaults);
  const [search, setSearch] = useState('');
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('all');

  const refresh = async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const all = await loadNews();
      setNews(all.filter((item) => !item.isEvent));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить новости');
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

  const filteredNews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return news
      .filter((item) => {
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query);
        const matchesPublish =
          publishFilter === 'all' ||
          (publishFilter === 'published' && item.published) ||
          (publishFilter === 'draft' && !item.published);
        return matchesSearch && matchesPublish;
      })
      .sort((a, b) => toDate(b.date) - toDate(a.date));
  }, [news, search, publishFilter]);

  const stats = useMemo(
    () => ({
      total: news.length,
      published: news.filter((item) => item.published).length,
      drafts: news.filter((item) => !item.published).length,
    }),
    [news],
  );

  const openCreate = () => {
    setDraft(defaults);
    setIsDialogOpen(true);
  };

  const openEdit = (item: News) => {
    setDraft({
      id: item.id,
      title: item.title,
      content: item.content,
      published: item.published,
    });
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error('Заполните заголовок и текст новости');
      return;
    }
    setIsSaving(true);
    try {
      if (draft.id) {
        const updated = await updateNews(draft.id, {
          title: draft.title.trim(),
          content: draft.content.trim(),
          published: draft.published,
          isEvent: false,
        });
        setNews((prev) => prev.map((item) => (item.id === draft.id ? updated : item)));
        toast.success('Новость обновлена');
      } else {
        const optimistic: News = {
          id: `news-${Date.now()}`,
          title: draft.title.trim(),
          content: draft.content.trim(),
          date: new Date(),
          published: draft.published,
          isEvent: false,
        };
        const created = await createNews(optimistic);
        setNews((prev) => [created, ...prev]);
        toast.success('Новость создана');
      }
      setIsDialogOpen(false);
      setDraft(defaults);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить новость');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublished = async (item: News) => {
    try {
      const updated = await updateNews(item.id, { published: !item.published, isEvent: false });
      setNews((prev) => prev.map((newsItem) => (newsItem.id === item.id ? updated : newsItem)));
      toast.success(updated.published ? 'Новость опубликована' : 'Новость снята с публикации');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить новость');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Удалить новость?')) {
      return;
    }
    try {
      await deleteNews(id);
      setNews((prev) => prev.filter((item) => item.id !== id));
      toast.success('Новость удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить новость');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Новости</h1>
          <p className="text-[#133C2A]/60">Публикации для родителей в личном кабинете</p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
          <Button variant="outline" className="rounded-2xl" onClick={() => void refresh(true)} disabled={isRefreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {isRefreshing ? 'Обновляем...' : 'Обновить'}
          </Button>
          <Button onClick={openCreate} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
            <Plus className="w-4 h-4 mr-2" />
            Добавить новость
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Всего</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Опубликовано</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.published}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-3 md:p-5"><p className="text-xs text-[#133C2A]/60 md:text-sm">Черновики</p><p className="text-2xl text-[#133C2A] md:text-3xl">{stats.drafts}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader><CardTitle className="text-[#133C2A]">Лента новостей</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#133C2A]/40" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по новостям" className="pl-9 rounded-xl" />
            </div>
            <Select value={publishFilter} onValueChange={(value: PublishFilter) => setPublishFilter(value)}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все публикации</SelectItem>
                <SelectItem value="published">Опубликованные</SelectItem>
                <SelectItem value="draft">Черновики</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : filteredNews.length === 0 ? (
            <p className="text-[#133C2A]/60">Новостей по текущему фильтру нет</p>
          ) : (
            filteredNews.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#133C2A]/10 p-3 md:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[#133C2A]">{item.title}</p>
                    <p className="text-sm text-[#133C2A]/70 whitespace-pre-line">{item.content}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="rounded-xl">
                        {item.published ? 'Опубликовано' : 'Черновик'}
                      </Badge>
                      <span className="text-xs text-[#133C2A]/50">
                        {item.date.toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0 sm:flex-row sm:items-center sm:gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)} className="rounded-xl" title="Редактировать">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void togglePublished(item)} className="rounded-xl" title="Сменить статус публикации">
                      <Megaphone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void remove(item.id)} className="rounded-xl" title="Удалить">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle className="text-[#133C2A]">{draft.id ? 'Редактирование новости' : 'Новая новость'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Заголовок</Label>
              <Input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Текст</Label>
              <Textarea value={draft.content} onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-[#133C2A]/10 p-3">
              <Label htmlFor="publish-switch">Опубликовать сразу</Label>
              <Switch
                id="publish-switch"
                checked={draft.published}
                onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, published: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-2xl">Отмена</Button>
            <Button onClick={() => void save()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" disabled={isSaving}>
              {isSaving ? 'Сохраняем...' : draft.id ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
