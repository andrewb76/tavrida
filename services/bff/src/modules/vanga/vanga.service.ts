import { BadRequestException, Injectable } from '@nestjs/common';
import {
  buildRegistrationsSeries,
  compare,
  findBreakEvenMonth,
  simulate,
  type GrowthModel,
  type MonthlyLedger,
  type OneTimePriceMap,
  type PlanMix,
  type PlanPrices,
  type ReferralModelInstance,
  type ReferralParams,
  type SimulateInput,
  type SimulateResult,
} from '@tavrida/monetization-engine';
import type { VangaDefaults } from './load-vanga-defaults';
import { buildVangaOverlay, loadVangaDefaults } from './load-vanga-defaults';
import type { ActivityDto, CostsDto, DepositsDto, GrowthDto, ReferralDto, SimulateRequestDto, SubscriptionsDto } from './dto/vanga.dto';

type RangeDefault = { default?: number | boolean | null };
type OneTimeYaml = Record<string, { default?: number; enabled?: boolean }>;

@Injectable()
export class VangaService {
  private defaultsCache: VangaDefaults | null = null;

  getDefaults() {
    const config = this.loadDefaults();
    return {
      version: config.version,
      currency: config.currency,
      config,
      overlay: buildVangaOverlay(config),
    };
  }

  simulateRequest(dto: SimulateRequestDto): SimulateResult {
    const defaults = this.loadDefaults();
    const input = this.toSimulateInput(dto, defaults);
    const result = simulate(input);
    return this.applyManualBurn(result, dto.costs);
  }

  compareRequests(scenarios: (SimulateRequestDto & { scenarioId: string })[]) {
    const defaults = this.loadDefaults();
    const inputs = scenarios.map((scenario) => this.toSimulateInput(scenario, defaults));
    const results = compare(inputs);
    return scenarios.map((scenario, index) => ({
      scenarioId: scenario.scenarioId,
      result: this.applyManualBurn(results[index], scenario.costs),
    }));
  }

  private loadDefaults(): VangaDefaults {
    if (!this.defaultsCache) {
      this.defaultsCache = loadVangaDefaults();
    }
    return this.defaultsCache;
  }

  private toSimulateInput(dto: SimulateRequestDto, defaults: VangaDefaults): SimulateInput {
    const periodMonths = dto.periodMonths;
    const growthModel = this.toGrowthModel(dto.growth, defaults);
    const registrationsByMonth = buildRegistrationsSeries(growthModel, periodMonths);

    const cohort = dto.cohort;
    const prices = this.resolvePrices(dto.subscriptions, defaults);
    const oneTimePrices = this.resolveOneTimePrices(dto.oneTimePrices, defaults);
    const referral = this.resolveReferral(dto.referral, defaults);
    const costItems = this.resolveCostItems(dto.costs, defaults);
    const paymentProcessorPercent = this.readCostDefault(defaults, 'payment_processor_percent', 2.5);
    const taxPercentOfNet = this.readCostDefault(defaults, 'tax_percent_of_net', 6);

    const activity = registrationsByMonth.map((regs: number) =>
      this.buildActivitySnapshot(regs, cohort.planMix as PlanMix, dto.activity, defaults),
    );

    const depositsVolumeByMonth = this.buildDepositsSeries(
      registrationsByMonth,
      cohort.planMix,
      dto.deposits,
      defaults,
    );

    return {
      periodMonths,
      registrationsByMonth,
      planMix: cohort.planMix,
      churnRatePercent: cohort.churnPercent,
      yearlyBillingSharePercent:
        cohort.yearlyBillingSharePercent ??
        this.readNestedDefault(defaults.cohort as Record<string, RangeDefault>, 'yearlyBillingSharePercent', 15),
      prices,
      activity,
      oneTimePrices,
      referral,
      costItems,
      depositsVolumeByMonth,
      paymentProcessorPercent,
      taxPercentOfNet,
    };
  }

  private toGrowthModel(growth: GrowthDto, defaults: VangaDefaults): GrowthModel {
    const yamlGrowth = defaults.growth as Record<string, unknown>;
    switch (growth.model) {
      case 'linear':
        return {
          type: 'linear',
          registrationsPerMonth:
            growth.registrationsPerMonth ??
            this.readNestedDefault(yamlGrowth.linear as Record<string, RangeDefault>, 'registrationsPerMonth', 40),
        };
      case 'exponential':
        return {
          type: 'exponential',
          registrationsMonth1:
            growth.registrationsMonth1 ??
            this.readNestedDefault(yamlGrowth.exponential as Record<string, RangeDefault>, 'registrationsMonth1', 20),
          monthlyGrowthRatePercent:
            growth.monthlyGrowthRatePercent ??
            this.readNestedDefault(
              yamlGrowth.exponential as Record<string, RangeDefault>,
              'monthlyGrowthRatePercent',
              8,
            ),
        };
      case 'logistic_s_curve':
        return {
          type: 'logistic_s_curve',
          carryingCapacity:
            growth.carryingCapacity ??
            this.readNestedDefault(
              yamlGrowth.logistic_s_curve as Record<string, RangeDefault>,
              'carryingCapacity',
              3000,
            ),
          inflectionMonth:
            growth.inflectionMonth ??
            this.readNestedDefault(yamlGrowth.logistic_s_curve as Record<string, RangeDefault>, 'inflectionMonth', 9),
          steepness:
            growth.steepness ??
            this.readNestedDefault(yamlGrowth.logistic_s_curve as Record<string, RangeDefault>, 'steepness', 0.8),
        };
      default:
        throw new BadRequestException({ type: 'invalid_growth_model', detail: growth.model });
    }
  }

  private resolvePrices(subscriptions: SubscriptionsDto | undefined, defaults: VangaDefaults): PlanPrices {
    const yamlSubs = defaults.subscriptions as Record<string, Record<string, RangeDefault>>;
    return {
      basic: {
        monthly:
          subscriptions?.basic?.monthlyPrice ??
          this.readNestedDefault(yamlSubs.basic, 'monthlyPrice', 99),
        yearly:
          subscriptions?.basic?.yearlyPrice ?? this.readNestedDefault(yamlSubs.basic, 'yearlyPrice', 990),
      },
      pro: {
        monthly:
          subscriptions?.pro?.monthlyPrice ?? this.readNestedDefault(yamlSubs.pro, 'monthlyPrice', 399),
        yearly:
          subscriptions?.pro?.yearlyPrice ?? this.readNestedDefault(yamlSubs.pro, 'yearlyPrice', 3990),
      },
    };
  }

  private resolveOneTimePrices(
    override: Record<string, { amountRub?: number; enabled?: boolean }> | undefined,
    defaults: VangaDefaults,
  ): OneTimePriceMap {
    const yaml = (defaults.oneTimePrices ?? {}) as OneTimeYaml;
    const map: OneTimePriceMap = {};
    for (const [target, row] of Object.entries(yaml)) {
      const custom = override?.[target];
      map[target] = {
        amountRub: custom?.amountRub ?? row.default ?? 0,
        enabled: custom?.enabled ?? row.enabled ?? false,
      };
    }
    if (override) {
      for (const [target, row] of Object.entries(override)) {
        if (!map[target]) {
          map[target] = {
            amountRub: row.amountRub ?? 0,
            enabled: row.enabled ?? false,
          };
        }
      }
    }
    return map;
  }

  private resolveReferral(referral: ReferralDto | undefined, defaults: VangaDefaults): ReferralParams {
    const yaml = defaults.referral as Record<string, unknown>;
    const tree = yaml.tree as { payoutDistributionByDepth?: { default?: number[] } };
    const yamlModels = yaml.models as Record<string, Record<string, RangeDefault>> | undefined;
    const modelOptions = (
      yaml.calculationModelId as { options?: { id: string }[] } | undefined
    )?.options;
    const depthCoefficients = (yaml.depthCoefficients as { default?: number[] })?.default ?? [1, 0.3, 0.1];
    const payoutDistributionByDepth =
      tree?.payoutDistributionByDepth?.default ?? [70, 20, 10];

    const defaultModels: ReferralModelInstance[] = (modelOptions ?? []).map((opt) => ({
      modelId: opt.id as ReferralModelInstance['modelId'],
      enabled: false,
      params: this.readModelParamsFromYaml(yamlModels?.[opt.id]),
    }));

    const requestModels = referral?.models?.map((row) => ({
      modelId: row.modelId,
      enabled: row.enabled,
      params: row.params ?? {},
    }));

    return {
      programEnabled:
        referral?.programEnabled ??
        ((yaml.programEnabled as RangeDefault)?.default as boolean) ??
        false,
      attachRatePercent:
        referral?.attachRatePercent ??
        this.readNestedDefault(yaml as Record<string, RangeDefault>, 'attachRatePercent', 25),
      maxDepth:
        referral?.maxDepth ?? this.readNestedDefault(yaml as Record<string, RangeDefault>, 'maxDepth', 1),
      depthCoefficients,
      payoutDistributionByDepth,
      models: requestModels?.length ? requestModels : defaultModels,
    };
  }

  private readModelParamsFromYaml(
    section: Record<string, RangeDefault> | undefined,
  ): Record<string, number> {
    if (!section) return {};
    const params: Record<string, number> = {};
    for (const [key, row] of Object.entries(section)) {
      if (typeof row.default === 'number') {
        params[key] = row.default;
      }
    }
    return params;
  }

  private resolveCostItems(costs: CostsDto | undefined, defaults: VangaDefaults): Record<string, number> {
    const yamlCosts = (defaults.costs as { items?: Record<string, RangeDefault> })?.items ?? {};
    const items: Record<string, number> = {};
    for (const [key, row] of Object.entries(yamlCosts)) {
      items[key] = costs?.items?.[key] ?? (typeof row.default === 'number' ? row.default : 0);
    }
    if (costs?.items) {
      for (const [key, value] of Object.entries(costs.items)) {
        items[key] = value;
      }
    }
    return items;
  }

  private readCostDefault(defaults: VangaDefaults, key: string, fallback: number): number {
    const items = (defaults.costs as { items?: Record<string, RangeDefault> })?.items;
    return this.readNestedDefault(items ?? {}, key, fallback);
  }

  private buildActivitySnapshot(
    registrations: number,
    planMix: PlanMix,
    activity: ActivityDto | undefined,
    defaults: VangaDefaults,
  ) {
    const yamlActivity = defaults.activity as Record<string, unknown>;
    const auctionsPerUser =
      activity?.auctionsPerUserPerMonth ??
      this.readPlanWeightedDefault(
        yamlActivity.auctionsCreatedPerUserPerMonth as { byPlan?: Record<string, RangeDefault> },
        planMix,
        1,
      );
    const promotionAttach =
      activity?.promotionAttachRatePercent ??
      this.readNestedDefault(yamlActivity as Record<string, RangeDefault>, 'auctionPromotionAttachRatePercent', 10);
    const reserveAttach =
      activity?.reserveAttachRatePercent ??
      this.readNestedDefault(yamlActivity as Record<string, RangeDefault>, 'auctionReserveAttachRatePercent', 5);
    const customAttach =
      activity?.customPresetAttachRatePercent ??
      this.readNestedDefault(
        yamlActivity as Record<string, RangeDefault>,
        'auctionCustomPresetAttachRatePercent',
        3,
      );

    const paidShare = (planMix.basic + planMix.pro) / 100;
    const auctionEvents = registrations * paidShare * auctionsPerUser;

    return {
      promotionEvents: Math.round((auctionEvents * promotionAttach) / 100),
      reserveEvents: Math.round((auctionEvents * reserveAttach) / 100),
      customPresetEvents: Math.round((auctionEvents * customAttach) / 100),
      forumReactionEvents: {} as Record<string, number>,
    };
  }

  private buildDepositsSeries(
    registrationsByMonth: number[],
    planMix: PlanMix,
    deposits: DepositsDto | undefined,
    defaults: VangaDefaults,
  ): number[] {
    const yamlDeposits = defaults.deposits as Record<string, RangeDefault>;
    const avgAmount =
      deposits?.avgAmountRub ?? this.readNestedDefault(yamlDeposits, 'avgAmountRub', 500);
    const eventsPerUser =
      deposits?.eventsPerPayingUserPerMonth ??
      this.readNestedDefault(yamlDeposits, 'eventsPerPayingUserPerMonth', 1.2);
    const shareDepositing =
      (deposits?.shareOfUsersDepositingPercent ??
        this.readNestedDefault(yamlDeposits, 'shareOfUsersDepositingPercent', 40)) / 100;
    const paidShare = (planMix.basic + planMix.pro) / 100;

    return registrationsByMonth.map((regs) => {
      const depositors = regs * paidShare * shareDepositing;
      return Math.round(depositors * eventsPerUser * avgAmount);
    });
  }

  private applyManualBurn(result: SimulateResult, costs: CostsDto | undefined): SimulateResult {
    if (costs?.manualTotalBurn == null) return result;
    return {
      ...result,
      breakEvenMonth: findBreakEvenMonth(
        result.months.map((m: MonthlyLedger) => m.cumulativeNet),
        costs.manualTotalBurn,
      ),
    };
  }

  private readNestedDefault(
    section: Record<string, RangeDefault> | undefined,
    key: string,
    fallback: number,
  ): number {
    const value = section?.[key]?.default;
    return typeof value === 'number' ? value : fallback;
  }

  private readPlanWeightedDefault(
    section: { byPlan?: Record<string, RangeDefault> } | undefined,
    planMix: PlanMix,
    fallback: number,
  ): number {
    const byPlan = section?.byPlan;
    if (!byPlan) return fallback;
    const num = (value: unknown) => (typeof value === 'number' ? value : 0);
    const total = planMix.free + planMix.basic + planMix.pro || 1;
    const weighted =
      (planMix.free * num(byPlan.free?.default) +
        planMix.basic * num(byPlan.basic?.default) +
        planMix.pro * num(byPlan.pro?.default)) /
      total;
    return weighted || fallback;
  }
}
