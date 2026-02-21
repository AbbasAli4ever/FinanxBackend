export enum ProductType {
  INVENTORY = 'INVENTORY',
  NON_INVENTORY = 'NON_INVENTORY',
  SERVICE = 'SERVICE',
  BUNDLE = 'BUNDLE',
}

export interface ProductTypeInfo {
  label: string;
  description: string;
  trackInventory: boolean;
}

export const PRODUCT_TYPE_INFO: Record<ProductType, ProductTypeInfo> = {
  [ProductType.INVENTORY]: {
    label: 'Inventory',
    description:
      'Products you buy and/or sell and track quantities of',
    trackInventory: true,
  },
  [ProductType.NON_INVENTORY]: {
    label: 'Non-Inventory',
    description:
      'Products you buy and/or sell but do not need to track quantities of',
    trackInventory: false,
  },
  [ProductType.SERVICE]: {
    label: 'Service',
    description: 'Services that you provide to customers',
    trackInventory: false,
  },
  [ProductType.BUNDLE]: {
    label: 'Bundle',
    description:
      'A collection of products and/or services sold together',
    trackInventory: false,
  },
};
