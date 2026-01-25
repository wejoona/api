export * from './base-bill-adapter';
export * from './cie-adapter';
export * from './sodeci-adapter';
export * from './orange-money-adapter';
export * from './mtn-adapter';
export * from './moov-adapter';
export * from './generic-bill-adapter';

import { CieAdapter } from './cie-adapter';
import { SodeciAdapter } from './sodeci-adapter';
import { OrangeMoneyAdapter } from './orange-money-adapter';
import { MtnAdapter } from './mtn-adapter';
import { MoovAdapter } from './moov-adapter';

export const BillAdapters = [
  CieAdapter,
  SodeciAdapter,
  OrangeMoneyAdapter,
  MtnAdapter,
  MoovAdapter,
];
