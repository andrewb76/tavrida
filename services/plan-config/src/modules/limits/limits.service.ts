import { Injectable, Logger } from '@nestjs/common';
import { PlanVariablesService } from '../plan-variables/plan-variables.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  constructor(
    private readonly subscriptions: SubscriptionsService,
    private readonly planVariables: PlanVariablesService,
  ) {}

  async checkLimit(input: {
    userId: string;
    variableKey: string;
    requestedValue: number;
    currentUsage: number;
  }) {
    let planId: string;
    try {
      planId = await this.subscriptions.resolvePlanId(input.userId);
    } catch (error) {
      this.logger.error(`resolvePlanId failed for user ${input.userId}`, error);
      return {
        allowed: false,
        planId: 'free',
        limit: null,
        remaining: 0,
        reason: 'internal_error',
        detail: error instanceof Error ? error.message : 'resolvePlanId failed',
      };
    }

    let row: Awaited<ReturnType<PlanVariablesService['getTier']>>;
    try {
      row = await this.planVariables.getTier(planId, input.variableKey);
    } catch (error) {
      this.logger.error(`getTier failed for plan ${planId}, key ${input.variableKey}`, error);
      return {
        allowed: false,
        planId,
        limit: null,
        remaining: 0,
        reason: 'internal_error',
        detail: error instanceof Error ? error.message : 'getTier failed',
      };
    }

    if (!row) {
      return {
        allowed: false,
        planId,
        limit: null,
        remaining: 0,
        reason: 'unknown_variable',
      };
    }

    const limit = row.limitValue;
    if (!row.isEnabled || limit === null) {
      return {
        allowed: false,
        planId,
        limit: null,
        remaining: 0,
        reason: !row.isEnabled ? 'tier_disabled' : 'invalid_limit',
      };
    }
    if (limit === -1) {
      return { allowed: true, planId, limit: null, remaining: null };
    }

    const remaining = Math.max(0, limit - input.currentUsage);
    const allowed = input.currentUsage + input.requestedValue <= limit;

    return { allowed, planId, limit, remaining };
  }

  async canUseFeature(input: { userId: string; featureKey: string }) {
    let planId: string;
    try {
      planId = await this.subscriptions.resolvePlanId(input.userId);
    } catch (error) {
      this.logger.error(`resolvePlanId failed for user ${input.userId}`, error);
      return {
        allowed: false,
        planId: 'free',
        reason: 'internal_error',
        detail: error instanceof Error ? error.message : 'resolvePlanId failed',
      };
    }

    let row: Awaited<ReturnType<PlanVariablesService['getTier']>>;
    try {
      row = await this.planVariables.getTier(planId, input.featureKey);
    } catch (error) {
      this.logger.error(`getTier failed for plan ${planId}, key ${input.featureKey}`, error);
      return {
        allowed: false,
        planId,
        reason: 'internal_error',
        detail: error instanceof Error ? error.message : 'getTier failed',
      };
    }

    if (!row) return { allowed: false, planId, reason: 'unknown_variable' };
    if (!row.isEnabled) return { allowed: false, planId, reason: 'tier_disabled' };
    return { allowed: row.isFeatureEnabled, planId };
  }
}
