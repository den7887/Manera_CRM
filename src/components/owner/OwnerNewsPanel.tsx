import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { News } from '../../types';
import { createNews, deleteNews, loadNews, updateNews } from '../../lib/backendApi';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';

const defaults = {
  title: '',
  content: '',
  published: true,
};

export function OwnerNewsPanel() {
  const [news, setNews] = useState<News[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draft, setDraft] = useState(defaults);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const all = await loadNews();
      setNews(all.filter((item) => !item.isEvent));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить новости');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(
    () => ({
      total: news.length,
      published: news.filter((item) => item.published).length,
      drafts: news.filter((item) => !item.published).length,
    }),
    [news],
  );

  const add = async () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error('Заполните заголовок и текст новости');
      return;
    }
    const optimistic: News = {
      id: `news-${Date.now()}`,
      title: draft.title.trim(),
      content: draft.content.trim(),
      date: new Date(),
      published: draft.published,
      isEvent: false,
    };
    try {
      const created = await createNews(optimistic);
      setNews((prev) => [created, ...prev]);
      setIsDialogOpen(false);
      setDraft(defaults);
      toast.success('Новость создана');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать новость');
    }
  };

  const togglePublished = async (item: News) => {
    try {
      const updated = await updateNews(item.id, { published: !item.published });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#133C2A] mb-2">Новости</h1>
          <p className="text-[#133C2A]/60">Публикации для родителей в личном кабинете</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">
          <Plus className="w-4 h-4 mr-2" />
          Добавить новость
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Всего</p><p className="text-3xl text-[#133C2A]">{stats.total}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Опубликовано</p><p className="text-3xl text-[#133C2A]">{stats.published}</p></CardContent></Card>
        <Card className="border-none soft-shadow"><CardContent className="p-5"><p className="text-sm text-[#133C2A]/60">Черновики</p><p className="text-3xl text-[#133C2A]">{stats.drafts}</p></CardContent></Card>
      </div>

      <Card className="border-none soft-shadow">
        <CardHeader><CardTitle className="text-[#133C2A]">Лента новостей</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-[#133C2A]/60">Загрузка...</p>
          ) : news.length === 0 ? (
            <p className="text-[#133C2A]/60">Новостей пока нет</p>
          ) : (
            news.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[#133C2A]/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[#133C2A]">{item.title}</p>
                    <p className="text-sm text-[#133C2A]/70 whitespace-pre-line">{item.content}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-xl">
                        {item.published ? 'Опубликовано' : 'Черновик'}
                      </Badge>
                      <span className="text-xs text-[#133C2A]/50">
                        {item.date.toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => void togglePublished(item)} className="rounded-xl">
                      <Megaphone className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void remove(item.id)} className="rounded-xl">
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
          <DialogHeader><DialogTitle className="text-[#133C2A]">Новая новость</DialogTitle></DialogHeader>
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
            <Button onClick={() => void add()} className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]">Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

