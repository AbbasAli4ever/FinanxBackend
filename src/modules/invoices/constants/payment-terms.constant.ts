export const PAYMENT_TERMS = {
  DUE_ON_RECEIPT: {
    label: 'Due on Receipt',
    days: 0,
  },
  NET_10: {
    label: 'Net 10',
    days: 10,
  },
  NET_15: {
    label: 'Net 15',
    days: 15,
  },
  NET_30: {
    label: 'Net 30',
    days: 30,
  },
  NET_45: {
    label: 'Net 45',
    days: 45,
  },
  NET_60: {
    label: 'Net 60',
    days: 60,
  },
  NET_90: {
    label: 'Net 90',
    days: 90,
  },
  CUSTOM: {
    label: 'Custom',
    days: null,
  },
};

export type PaymentTermCode = keyof typeof PAYMENT_TERMS;
