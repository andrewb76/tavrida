import { Injectable } from '@nestjs/common';
import { ParametersService } from '../parameters/parameters.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class LimitsService {
  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly parameters: ParametersService,
  ) {}

  async checkLimit(input: {
    userId: string;
    parameterKey: string;
    requestedValue: number;
    currentUsage: number;
  }) {
    const planId = await this.subscriptions.resolvePlanId(input.userId);
    const row = await this.parameters.getPlanParameter(planId, input.parameterKey);

    if (!row) {
      return {
        allowed: false,
        planId,
        limit: null,
        remaining: 0,
        reason: 'unknown_parameter',
      };
    }

    const limit = row.limitValue;
    if (limit === null || limit === -1) {
      return { allowed: true, planId, limit: null, remaining: null };
    }

    const remaining = Math.max(0, limit - input.currentUsage);
    const allowed = input.currentUsage + input.requestedValue <= limit;

    return { allowed, planId, limit, remaining };
  }

  async canUseFeature(input: { userId: string; featureKey: string }) {
    const planId = await this.subscriptions.resolvePlanId(input.userId);
    const row = await this.parameters.getPlanParameter(planId, input.featureKey);

    return {
      allowed: row?.isFeatureEnabled ?? false,
      planId,
    };
  }
}
