import axios from 'axios';
import type {
  Parameter,
  Plan,
  PlanValue,
  ServiceInfo,
  SystemValue,
  UsageLogEntry,
  UserLimit,
  UserSubscription,
  UserValue,
} from '@/types/settings';

const api = axios.create({
  baseURL: '/api/v1/admin/settings',
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const settingsApi = {
  // Services
  async getServices(): Promise<ServiceInfo[]> {
    const { data } = await api.get('/services');
    return data;
  },

  // Parameters
  async getParameters(service?: string, category?: string): Promise<Parameter[]> {
    const params: Record<string, string> = {};
    if (service) params.service = service;
    if (category) params.category = category;
    const { data } = await api.get('/parameters', { params });
    return data;
  },

  async getParameter(key: string): Promise<Parameter> {
    const { data } = await api.get(`/parameters/${encodeURIComponent(key)}`);
    return data;
  },

  async createParameter(body: Partial<Parameter>): Promise<Parameter> {
    const { data } = await api.post('/parameters', body);
    return data;
  },

  async updateParameter(key: string, body: Partial<Parameter>): Promise<Parameter> {
    const { data } = await api.patch(`/parameters/${encodeURIComponent(key)}`, body);
    return data;
  },

  async deleteParameter(key: string): Promise<void> {
    await api.delete(`/parameters/${encodeURIComponent(key)}`);
  },

  // System Values
  async getSystemValues(domain?: string): Promise<SystemValue[]> {
    const { data } = await domain
      ? api.get(`/system-values/${domain}`)
      : api.get('/system-values');
    return data;
  },

  async updateSystemValue(key: string, value: unknown): Promise<SystemValue> {
    const domain = key.split('.')[0];
    const { data } = await api.post(`/system-values/${domain}`, { values: { [key]: value } });
    return data;
  },

  // Plans
  async getPlans(): Promise<Plan[]> {
    const { data } = await api.get('/plans');
    return data;
  },

  async getPlan(id: string): Promise<Plan> {
    const { data } = await api.get(`/plans/${id}`);
    return data;
  },

  async createPlan(body: Partial<Plan>): Promise<Plan> {
    const { data } = await api.post('/plans', body);
    return data;
  },

  async updatePlan(id: string, body: Partial<Plan>): Promise<Plan> {
    const { data } = await api.patch(`/plans/${id}`, body);
    return data;
  },

  async deletePlan(id: string): Promise<void> {
    await api.delete(`/plans/${id}`);
  },

  // Plan Values
  async getPlanValues(planId?: string): Promise<PlanValue[]> {
    const params: Record<string, string> = {};
    if (planId) params.planId = planId;
    const { data } = await api.get('/plan-values', { params });
    return data;
  },

  async updatePlanValue(planId: string, key: string, value: unknown): Promise<PlanValue> {
    const { data } = await api.patch(`/plan-values/${planId}/${encodeURIComponent(key)}`, { value });
    return data;
  },

  // User Subscriptions
  async getSubscriptions(params?: { planId?: string; status?: string }): Promise<UserSubscription[]> {
    const { data } = await api.get('/user-limits', { params });
    return data;
  },

  async getSubscription(userId: string): Promise<UserSubscription> {
    const { data } = await api.get(`/user-limits/${userId}`);
    return data;
  },

  // User Values
  async getUserValues(userId: string): Promise<UserValue[]> {
    const { data } = await api.get(`/user-values/${userId}`);
    return data;
  },

  async updateUserValue(userId: string, key: string, value: unknown): Promise<UserValue> {
    const { data } = await api.patch(`/user-values/${userId}/${encodeURIComponent(key)}`, { value });
    return data;
  },

  // Limits
  async getUserLimits(userId?: string, planId?: string): Promise<UserLimit[]> {
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    if (planId) params.planId = planId;
    const { data } = await api.get('/user-limits', { params });
    return data;
  },

  async grantLimit(body: { userId: string; key: string; period: string; amount: number; reason?: string }): Promise<void> {
    await api.post('/user-limits/grant', body);
  },

  async getUsageLog(params: {
    userId?: string;
    key?: string;
    period?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: UsageLogEntry[]; total: number }> {
    const { data } = await api.get('/limits/usage-log', { params });
    return data;
  },

  // YAML
  async exportYaml(): Promise<string> {
    const { data } = await api.post('/yaml/export', {}, { responseType: 'text' });
    return data;
  },

  async importYaml(yaml: string): Promise<{ created: Record<string, number>; updated: Record<string, number>; errors: string[] }> {
    const { data } = await api.post('/yaml/import', { yaml });
    return data;
  },
};
