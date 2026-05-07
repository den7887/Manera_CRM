import { MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Progress } from '../ui/progress';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge';
import { MoneySubscriptionRecord, formatMoney, formatShortDate } from './moneyTypes';

export function SubscriptionMoneyCard({
  subscription,
  onOpen,
  onOpenPayments,
  onAssignGroup,
}: {
  subscription: MoneySubscriptionRecord;
  onOpen: (subscription: MoneySubscriptionRecord) => void;
  onOpenPayments?: (subscription: MoneySubscriptionRecord) => void;
  onAssignGroup?: (subscription: MoneySubscriptionRecord) => void;
}) {
  return (
    <Card className="border-none bg-white/95 shadow-[0_12px_28px_rgba(19,60,42,0.06)]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SubscriptionStatusBadge status={subscription.status} />
            <p className="mt-3 text-lg leading-tight text-[#133C2A]">{subscription.childName}</p>
            <p className="mt-1 text-sm text-[#133C2A]/62">{subscription.planTitle}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-2xl text-[#133C2A]/60">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl">
              <DropdownMenuItem onClick={() => onOpen(subscription)}>Открыть</DropdownMenuItem>
              {onOpenPayments ? <DropdownMenuItem onClick={() => onOpenPayments(subscription)}>Открыть оплаты</DropdownMenuItem> : null}
              {onAssignGroup ? <DropdownMenuItem onClick={() => onAssignGroup(subscription)}>Назначить группу</DropdownMenuItem> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
            <p className="text-[#133C2A]/50">Стоимость</p>
            <p className="mt-1 text-[#133C2A]">{subscription.amount ? formatMoney(subscription.amount) : '—'}</p>
          </div>
          <div className="rounded-2xl bg-[#F8F4E3]/70 p-3">
            <p className="text-[#133C2A]/50">Действует до</p>
            <p className="mt-1 text-[#133C2A]">{formatShortDate(subscription.expiresAt)}</p>
          </div>
        </div>

        {subscription.lessonsTracked && typeof subscription.totalLessons === 'number' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-[#133C2A]/68">
              <span>Осталось занятий</span>
              <span>{subscription.remainingLessons ?? 0} из {subscription.totalLessons}</span>
            </div>
            <Progress value={100 - subscription.progressPercent} className="h-2 bg-[#133C2A]/10 [&>div]:bg-[#133C2A]" />
          </div>
        ) : (
          <p className="text-sm text-[#133C2A]/60">
            {subscription.groupName ? `Группа: ${subscription.groupName}` : 'Группа пока не назначена'}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button className="rounded-2xl bg-gradient-to-r from-[#133C2A] to-[#D4AF37]" onClick={() => onOpen(subscription)}>
            Продлить
          </Button>
          <Button variant="outline" className="rounded-2xl border-[#133C2A]/15" onClick={() => onOpen(subscription)}>
            Открыть
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

