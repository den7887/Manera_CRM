import { Settings, Home, Eye, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { useState } from 'react';

export function AdminSettings() {
  const [welcomeTitle, setWelcomeTitle] = useState('Добро пожаловать');
  const [welcomeSubtitle, setWelcomeSubtitle] = useState('Сегодня отличный день для работы');
  const [welcomeEmoji, setWelcomeEmoji] = useState('✨');
  const [quote, setQuote] = useState('Ты автор своего результата');
  const [quoteAuthor, setQuoteAuthor] = useState('Manera Dance Studio');

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-scale-in">
      <div>
        <h1 className="text-[#133C2A] mb-2">Настройки</h1>
        <p className="text-[#133C2A]/60">Персонализация интерфейса</p>
      </div>

      {/* Home Screen Customization */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Home className="w-5 h-5 text-[#D4AF37]" />
            Настройка главного экрана
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20">
            <p className="text-sm text-[#133C2A] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#D4AF37]" />
              Настройте текст приветствия для вашего экрана
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcome-title">Заголовок приветствия</Label>
              <div className="flex gap-2">
                <Input
                  id="welcome-title"
                  value={welcomeTitle}
                  onChange={(e) => setWelcomeTitle(e.target.value)}
                  placeholder="Добро пожаловать"
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
                />
                <Input
                  id="welcome-emoji"
                  value={welcomeEmoji}
                  onChange={(e) => setWelcomeEmoji(e.target.value)}
                  placeholder="✨"
                  className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] w-20"
                  maxLength={2}
                />
              </div>
              <p className="text-xs text-[#133C2A]/60">Основной заголовок и эмодзи</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-subtitle">Подзаголовок</Label>
              <Input
                id="welcome-subtitle"
                value={welcomeSubtitle}
                onChange={(e) => setWelcomeSubtitle(e.target.value)}
                placeholder="Сегодня отличный день для работы"
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
              <p className="text-xs text-[#133C2A]/60">Дополнительный текст под заголовком</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="quote-text">Цитата дня</Label>
              <Textarea
                id="quote-text"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                placeholder="Ты автор своего результата"
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37] min-h-[80px]"
              />
              <p className="text-xs text-[#133C2A]/60">Вдохновляющая цитата в конце страницы</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quote-author">Автор цитаты</Label>
              <Input
                id="quote-author"
                value={quoteAuthor}
                onChange={(e) => setQuoteAuthor(e.target.value)}
                placeholder="Manera Dance Studio"
                className="rounded-2xl border-[#133C2A]/20 focus:border-[#D4AF37]"
              />
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Предпросмотр</Label>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-xl"
              >
                <Eye className="w-4 h-4 mr-2" />
                Посмотреть полную версию
              </Button>
            </div>
            
            <div className="p-6 rounded-2xl border-2 border-[#133C2A]/10 bg-white space-y-4">
              {/* Welcome Header Preview */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#F8F4E3] to-white">
                <h2 className="text-[#133C2A] mb-1">
                  {welcomeTitle}, Имя! {welcomeEmoji}
                </h2>
                <p className="text-[#133C2A]/60 text-sm">
                  {welcomeSubtitle}
                </p>
              </div>

              {/* Quote Preview */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] text-center">
                <p className="text-white mb-2 italic">
                  "{quote}"
                </p>
                <p className="text-white/80 text-sm">— {quoteAuthor}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Preferences */}
      <Card className="border-none soft-shadow">
        <CardHeader>
          <CardTitle className="text-[#133C2A] flex items-center gap-2">
            <Palette className="w-5 h-5 text-[#D4AF37]" />
            Цветовая схема
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Изумрудный</Label>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[#133C2A] border-2 border-white shadow-md" />
                <span className="text-sm text-[#133C2A]/70">#133C2A</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Золотой</Label>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37] border-2 border-white shadow-md" />
                <span className="text-sm text-[#133C2A]/70">#D4AF37</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Бежевый</Label>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[#F8F4E3] border-2 border-[#133C2A]/10 shadow-md" />
                <span className="text-sm text-[#133C2A]/70">#F8F4E3</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Белый</Label>
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#133C2A]/10 shadow-md" />
                <span className="text-sm text-[#133C2A]/70">#FFFFFF</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-[#133C2A]/60 mt-4">
            Фирменные цвета студии Manera. Владелец может изменить их в настройках студии.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" className="rounded-2xl border-[#133C2A]/20">
          Отменить
        </Button>
        <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37] hover:opacity-90">
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
