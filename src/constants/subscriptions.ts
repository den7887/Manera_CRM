export interface StudioSubscription {
  id: 'hobby' | 'pro';
  name: 'Хобби' | 'Про';
  price: number;
  classesCount: number | null;
  classesTracked: boolean;
}

export const STUDIO_SUBSCRIPTIONS: StudioSubscription[] = [
  {
    id: 'hobby',
    name: 'Хобби',
    price: 5000,
    classesCount: 8,
    classesTracked: true,
  },
  {
    id: 'pro',
    name: 'Про',
    price: 7000,
    classesCount: null,
    classesTracked: false,
  },
];

export function findSubscriptionById(id: string): StudioSubscription | undefined {
  return STUDIO_SUBSCRIPTIONS.find((item) => item.id === id);
}
