import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import {
  AdminClientRecord,
  createAdminInvoice,
  createOwnerPricingPlan,
  loadAdminClients,
  loadOwnerPricing,
  OwnerPricingPlanDto,
} from '../../lib/backendApi';
import { toast } from 'sonner';
import { CreateInvoiceSheet } from '../money/CreateInvoiceSheet';
import { CreatePricingDraft, CreatePricingSheet } from '../money/CreatePricingSheet';
import { MoneyPricing } from '../money/MoneyPricing';
import { MoneyInvoiceDraft, moneyInvoiceTargetLabels } from '../money/moneyTypes';

const defaultCreateDraft: CreatePricingDraft = {
  title: '',
  basePrice: '',
  isActive: true,
  hasDiscount: false,
  discountPrice: '',
};

const defaultInvoiceDraft: MoneyInvoiceDraft = {
  clientId: '',
  parentUserId: '',
  parentPhone: '',
  parentFullName: '',
  childFullName: '',
  paymentType: 'subscription',
  planCode: '',
  paymentMethod: 'online',
  amount: '',
  dueDate: addDays(new Date(), 3).toISOString().slice(0, 10),
  startsAt: new Date().toISOString().slice(0, 10),
  useCustomStartsAt: false,
  comment: '',
};

export function OwnerPricingPanel() {
  const [pricingPlans, setPricingPlans] = useState<OwnerPricingPlanDto[]>([]);
  const [clients, setClients] = useState<AdminClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatePricingOpen, setIsCreatePricingOpen] = useState(false);
  const [pricingDraft, setPricingDraft] = useState<CreatePricingDraft>(defaultCreateDraft);
  const [isPricingSubmitting, setIsPricingSubmitting] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [invoiceDraft, setInvoiceDraft] = useState<MoneyInvoiceDraft>(defaultInvoiceDraft);
  const [isInvoiceSubmitting, setIsInvoiceSubmitting] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    try {
      const [plans, clientRows] = await Promise.all([loadOwnerPricing(), loadAdminClients()]);
      setPricingPlans(plans);
      setClients(clientRows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить прайс');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!invoiceDraft.clientId) return;
    const linkedClient = clients.find((item) => item.id === invoiceDraft.clientId);
    if (!linkedClient) return;
    if (invoiceDraft.parentUserId === linkedClient.parentUserId && invoiceDraft.parentPhone) return;
    setInvoiceDraft((prev) => ({
      ...prev,
      parentUserId: linkedClient.parentUserId || prev.parentUserId,
      parentPhone: linkedClient.parentPhone || prev.parentPhone,
      parentFullName: linkedClient.parentName || prev.parentFullName,
      childFullName: '',
    }));
  }, [invoiceDraft.clientId, invoiceDraft.parentPhone, invoiceDraft.parentUserId, clients]);

  const submitPricing = async () => {
    const title = pricingDraft.title.trim();
    const basePrice = Number(pricingDraft.basePrice);
    const discountPrice = Number(pricingDraft.discountPrice);
    const finalPrice = pricingDraft.hasDiscount ? discountPrice : basePrice;

    if (!title) {
      toast.error('Укажите название тарифа');
      return;
    }
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      toast.error('Укажите корректную стоимость тарифа');
      return;
    }

    setIsPricingSubmitting(true);
    try {
      await createOwnerPricingPlan({
        title,
        price: finalPrice,
        classes_count: null,
        classes_tracked: false,
        duration_days: 30,
        is_active: pricingDraft.isActive,
      });
      toast.success('Тариф создан');
      setIsCreatePricingOpen(false);
      setPricingDraft(defaultCreateDraft);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать тариф');
    } finally {
      setIsPricingSubmitting(false);
    }
  };

  const submitInvoice = async () => {
    const hasClientReference = Boolean(invoiceDraft.clientId);
    if (!hasClientReference && !invoiceDraft.parentPhone.trim()) {
      toast.error('Укажите телефон родителя для создания профиля');
      return;
    }
    if (!hasClientReference && !invoiceDraft.childFullName.trim()) {
      toast.error('Укажите имя ребенка');
      return;
    }

    setIsInvoiceSubmitting(true);
    try {
      const parsedAmount = invoiceDraft.amount.trim() ? Number(invoiceDraft.amount) : undefined;
      const selectedPlan = pricingPlans.find((plan) => plan.code === invoiceDraft.planCode);
      const composedComment = [moneyInvoiceTargetLabels[invoiceDraft.paymentType], selectedPlan?.title, invoiceDraft.comment.trim() || null]
        .filter(Boolean)
        .join(' · ');

      await createAdminInvoice({
        client_id: hasClientReference ? invoiceDraft.clientId : undefined,
        parent_user_id: invoiceDraft.parentUserId || undefined,
        parent_phone: hasClientReference ? undefined : invoiceDraft.parentPhone.trim(),
        parent_full_name: hasClientReference ? undefined : (invoiceDraft.parentFullName.trim() || undefined),
        child_full_name: hasClientReference ? undefined : invoiceDraft.childFullName.trim(),
        subscription_name: selectedPlan?.title || moneyInvoiceTargetLabels[invoiceDraft.paymentType],
        payment_method: invoiceDraft.paymentMethod,
        amount: parsedAmount,
        due_date: invoiceDraft.dueDate || undefined,
        starts_at: invoiceDraft.useCustomStartsAt ? invoiceDraft.startsAt || undefined : undefined,
        comment: composedComment || undefined,
      });

      toast.success('Счет создан');
      setIsCreateInvoiceOpen(false);
      setInvoiceDraft(defaultInvoiceDraft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать счет');
    } finally {
      setIsInvoiceSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="rounded-3xl bg-white/80 p-6 text-[#133C2A]/60">Загрузка прайса...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <MoneyPricing
        pricingPlans={pricingPlans}
        onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
        onCreatePricing={() => setIsCreatePricingOpen(true)}
      />

      <CreatePricingSheet
        open={isCreatePricingOpen}
        onOpenChange={setIsCreatePricingOpen}
        draft={pricingDraft}
        onChange={setPricingDraft}
        onSubmit={() => void submitPricing()}
        isSubmitting={isPricingSubmitting}
      />

      <CreateInvoiceSheet
        open={isCreateInvoiceOpen}
        onOpenChange={setIsCreateInvoiceOpen}
        clients={clients}
        pricingPlans={pricingPlans}
        draft={invoiceDraft}
        onChange={setInvoiceDraft}
        onSubmit={() => void submitInvoice()}
        isSubmitting={isInvoiceSubmitting}
      />
    </div>
  );
}
