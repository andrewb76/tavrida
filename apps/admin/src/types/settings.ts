export interface ServiceInfo {
  name: string;
  parameterCount: number;
}

export interface Parameter {
  key: string;
  service: string;
  category: 'system-var' | 'tarif-var' | 'limited-user-var' | 'user-var';
  name: string;
  description: string;
  paramType: 'int' | 'boolean' | 'string' | 'enum';
  defaultValue: unknown;
  userOverride: boolean;
  sortOrder: number;
  syncStatus: 'active' | 'stale';
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  sortOrder: number;
}

export interface PlanValue {
  planId: string;
  paramKey: string;
  value: unknown;
}

export interface SystemValue {
  paramKey: string;
  value: unknown;
  updatedBy: string;
  updatedAt: string;
}

export interface UserSubscription {
  userId: string;
  planId: string;
  startsAt: string;
  expiresAt: string | null;
  autoRenew: boolean;
  billingPeriod: 'monthly' | 'yearly' | null;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}

export interface UserValue {
  userId: string;
  paramKey: string;
  value: unknown;
}

export interface UserLimit {
  paramKey: string;
  planId: string;
  userId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  maxValue: number;
  remaining: number;
  purchasedRemaining: number;
  cycleStart: string;
  cycleEnd: string;
}

export interface UsageLogEntry {
  id: string;
  paramKey: string;
  planId: string;
  userId: string;
  period: string;
  delta: number;
  remainingAfter: number;
  source: 'base' | 'purchased' | 'grant' | 'restore';
  createdAt: string;
}

export interface YamlConfig {
  version: '1.0';
  plans: YamlPlan[];
  parameters: YamlParameter[];
}

export interface YamlPlan {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  sortOrder: number;
}

export interface YamlParameter {
  key: string;
  service: string;
  category: 'system-var' | 'tarif-var' | 'limited-user-var' | 'user-var';
  name: string;
  description: string;
  paramType: 'int' | 'boolean' | 'string' | 'enum';
  defaultValue: unknown;
  userOverride: boolean;
  sortOrder: number;
  planValues?: Record<string, unknown>;
  systemValue?: unknown;
}

export interface ImportPreview {
  wouldCreate: { parameters: YamlParameter[]; plans: YamlPlan[] };
  wouldUpdate: { parameters: { key: string; current: Parameter; proposed: YamlParameter }[] };
  wouldDelete: { parameters: string[]; plans: string[] };
  conflicts: string[];
}
