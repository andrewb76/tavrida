import type { ScalarVariableRegistration } from '../scalar-config/bff-scalar-variables.registry';

/** Auction-owned scalar keys — [PLATFORM-REGISTRY.md](../../../../docs/05-microservices/PLATFORM-REGISTRY.md). */
export const AUCTION_SCALAR_REGISTRY: ScalarVariableRegistration[] = [
  {
    key: 'auction.lot.image.aspectWidth',
    type: 'number',
    default: 4,
    service: 'auction',
    description: 'Соотношение сторон фото лота — ширина (например 4 в 4:3)',
  },
  {
    key: 'auction.lot.image.aspectHeight',
    type: 'number',
    default: 3,
    service: 'auction',
    description: 'Соотношение сторон фото лота — высота (например 3 в 4:3)',
  },
];
