import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';
import { compareVanga, fetchVangaDefaults, simulateVanga } from '@/services/vanga';
import type { VangaFormState, VangaSimulateRequest, ReferralModelId, SimulateResult } from '@/services/vanga.types';
import { readBoolDefault, readRange, readRangeSpec, sumCostItems } from '@/utils/vangaDefaults';
import { initReferralModelsFromConfig, parseReferralModelOptions } from '@/utils/vangaReferralModels';

export function useVangaForecast() {
  const loading = ref(true);
  const simulating = ref(false);
  const error = ref('');
  const config = ref<Record<string, unknown>>({});
  const result = ref<SimulateResult | null>(null);
  const compareResults = ref<{ scenarioId: string; result: SimulateResult }[]>([]);
  const compareMode = ref(false);
  const activeTab = ref<
    'overview' | 'inflow' | 'activity' | 'prices' | 'referral' | 'costs'
  >('overview');

  const form = ref<VangaFormState>({
    periodMonths: 12,
    preset: 'base',
    growthModel: 'linear',
    registrationsPerMonth: 40,
    registrationsMonth1: 20,
    monthlyGrowthRatePercent: 8,
    carryingCapacity: 3000,
    inflectionMonth: 9,
    steepness: 0.8,
    planMix: { free: 70, basic: 25, pro: 5 },
    churnPercent: 5,
    yearlyBillingSharePercent: 15,
    basicMonthly: 99,
    basicYearly: 990,
    proMonthly: 399,
    proYearly: 3990,
    auctionsPerUserPerMonth: 1,
    promotionAttachRatePercent: 10,
    reserveAttachRatePercent: 5,
    customPresetAttachRatePercent: 3,
    referralProgramEnabled: false,
    referralAttachRatePercent: 25,
    referralEditModelId: 'revshare_single',
    referralModels: initReferralModelsFromConfig({}),
    costItems: {},
    manualTotalBurn: 25000,
    manualBurnOnly: false,
    oneTimePrices: {},
    avgDepositRub: 500,
    depositsPerUser: 1.2,
    shareDepositingPercent: 40,
  });

  const referralModelOptions = computed(() => parseReferralModelOptions(config.value));

  const enabledReferralModels = computed(() =>
    referralModelOptions.value.filter((opt) => form.value.referralModels[opt.id]?.enabled),
  );
  const costItemKeys = computed(() => Object.keys(form.value.costItems).sort());
  const oneTimeKeys = computed(() => Object.keys(form.value.oneTimePrices).sort());

  const totalBurn = computed(() => sumCostItems(form.value.costItems));

  const lastMonth = computed(() => {
    const months = result.value?.months ?? [];
    return months.length ? months[months.length - 1] : null;
  });

  const chartMaxNet = computed(() => {
    const nets = result.value?.months.map((m) => Math.abs(m.net)) ?? [1];
    return Math.max(...nets, 1);
  });

  function initFormFromConfig(cfg: Record<string, unknown>) {
    const growth = cfg.growth as Record<string, unknown>;
    const cohort = cfg.cohort as Record<string, unknown>;
    const planMixSection = cohort.planMix as Record<string, unknown>;
    const subs = cfg.subscriptions as Record<string, Record<string, unknown>>;
    const activity = cfg.activity as Record<string, unknown>;
    const referral = cfg.referral as Record<string, unknown>;
    const costs = cfg.costs as {
      items?: Record<string, unknown>;
      totalMonthlyBurn?: { default?: number };
    };
    const deposits = cfg.deposits as Record<string, unknown>;
    const oneTime = cfg.oneTimePrices as Record<string, { default?: number; enabled?: boolean }>;
    const period = cfg.period as Record<string, unknown>;

    const costItems: Record<string, number> = {};
    for (const [key, row] of Object.entries(costs?.items ?? {})) {
      costItems[key] = readRange({ [key]: row }, key, 0);
    }

    const oneTimePrices: Record<string, { amountRub: number; enabled: boolean }> = {};
    for (const [key, row] of Object.entries(oneTime ?? {})) {
      oneTimePrices[key] = {
        amountRub: row.default ?? 0,
        enabled: row.enabled ?? false,
      };
    }

    form.value = {
      periodMonths: readRange(period, 'defaultMonths', 12),
      preset: 'base',
      growthModel: (growth?.defaultModel as VangaFormState['growthModel']) ?? 'linear',
      registrationsPerMonth: readRange(growth?.linear, 'registrationsPerMonth', 40),
      registrationsMonth1: readRange(growth?.exponential, 'registrationsMonth1', 20),
      monthlyGrowthRatePercent: readRange(growth?.exponential, 'monthlyGrowthRatePercent', 8),
      carryingCapacity: readRange(growth?.logistic_s_curve, 'carryingCapacity', 3000),
      inflectionMonth: readRange(growth?.logistic_s_curve, 'inflectionMonth', 9),
      steepness: readRange(growth?.logistic_s_curve, 'steepness', 0.8),
      planMix: {
        free: readRange(planMixSection, 'free', 70),
        basic: readRange(planMixSection, 'basic', 25),
        pro: readRange(planMixSection, 'pro', 5),
      },
      churnPercent: readRange(cohort, 'monthlyChurnRatePercent', 5),
      yearlyBillingSharePercent: readRange(cohort, 'yearlyBillingSharePercent', 15),
      basicMonthly: readRange(subs?.basic, 'monthlyPrice', 99),
      basicYearly: readRange(subs?.basic, 'yearlyPrice', 990),
      proMonthly: readRange(subs?.pro, 'monthlyPrice', 399),
      proYearly: readRange(subs?.pro, 'yearlyPrice', 3990),
      auctionsPerUserPerMonth: 1,
      promotionAttachRatePercent: readRange(activity, 'auctionPromotionAttachRatePercent', 10),
      reserveAttachRatePercent: readRange(activity, 'auctionReserveAttachRatePercent', 5),
      customPresetAttachRatePercent: readRange(activity, 'auctionCustomPresetAttachRatePercent', 3),
      referralProgramEnabled: readBoolDefault(referral, 'programEnabled', false),
      referralAttachRatePercent: readRange(referral, 'attachRatePercent', 25),
      referralEditModelId:
        ((referral?.calculationModelId as { default?: ReferralModelId })?.default) ??
        'revshare_single',
      referralModels: initReferralModelsFromConfig(cfg),
      costItems,
      manualTotalBurn: costs?.totalMonthlyBurn?.default ?? 25000,
      manualBurnOnly: false,
      oneTimePrices,
      avgDepositRub: readRange(deposits, 'avgAmountRub', 500),
      depositsPerUser: readRange(deposits, 'eventsPerPayingUserPerMonth', 1.2),
      shareDepositingPercent: readRange(deposits, 'shareOfUsersDepositingPercent', 40),
    };
  }

  function applyPresetMultiplier(
    preset: VangaFormState['preset'],
    base: VangaSimulateRequest,
  ): VangaSimulateRequest {
    const multipliers = config.value.scenarioMultipliers as
      | Record<string, { registrations?: number; churn?: number }>
      | undefined;
    const m = multipliers?.[preset];
    if (!m) return base;

    const req = JSON.parse(JSON.stringify(base)) as VangaSimulateRequest;
    if (req.growth.model === 'linear' && req.growth.registrationsPerMonth != null) {
      req.growth.registrationsPerMonth = Math.round(
        req.growth.registrationsPerMonth * (m.registrations ?? 1),
      );
    }
    if (m.churn) {
      req.cohort.churnPercent = Math.min(100, Math.round(req.cohort.churnPercent * m.churn * 10) / 10);
    }
    return req;
  }

  function buildRequest(state = form.value): VangaSimulateRequest {
    const growth =
      state.growthModel === 'linear'
        ? { model: 'linear' as const, registrationsPerMonth: state.registrationsPerMonth }
        : state.growthModel === 'exponential'
          ? {
              model: 'exponential' as const,
              registrationsMonth1: state.registrationsMonth1,
              monthlyGrowthRatePercent: state.monthlyGrowthRatePercent,
            }
          : {
              model: 'logistic_s_curve' as const,
              carryingCapacity: state.carryingCapacity,
              inflectionMonth: state.inflectionMonth,
              steepness: state.steepness,
            };

    return {
      periodMonths: state.periodMonths,
      growth,
      cohort: {
        planMix: state.planMix,
        churnPercent: state.churnPercent,
        yearlyBillingSharePercent: state.yearlyBillingSharePercent,
      },
      subscriptions: {
        basic: { monthlyPrice: state.basicMonthly, yearlyPrice: state.basicYearly },
        pro: { monthlyPrice: state.proMonthly, yearlyPrice: state.proYearly },
      },
      oneTimePrices: state.oneTimePrices,
      activity: {
        auctionsPerUserPerMonth: state.auctionsPerUserPerMonth,
        promotionAttachRatePercent: state.promotionAttachRatePercent,
        reserveAttachRatePercent: state.reserveAttachRatePercent,
        customPresetAttachRatePercent: state.customPresetAttachRatePercent,
      },
      referral: {
        programEnabled: state.referralProgramEnabled,
        attachRatePercent: state.referralAttachRatePercent,
        models: Object.entries(state.referralModels).map(([modelId, model]) => ({
          modelId: modelId as ReferralModelId,
          enabled: model.enabled,
          params: model.params,
        })),
      },
      costs: {
        items: state.costItems,
        manualTotalBurn: state.manualBurnOnly ? state.manualTotalBurn : null,
      },
      deposits: {
        avgAmountRub: state.avgDepositRub,
        eventsPerPayingUserPerMonth: state.depositsPerUser,
        shareOfUsersDepositingPercent: state.shareDepositingPercent,
      },
    };
  }

  const runSimulate = useDebounceFn(async () => {
    if (loading.value) return;
    simulating.value = true;
    error.value = '';
    try {
      if (compareMode.value) {
        const presets: VangaFormState['preset'][] = ['base', 'optimistic', 'pessimistic'];
        const scenarios = presets.map((preset) => {
          const state = { ...form.value, preset };
          const req = applyPresetMultiplier(preset, buildRequest(state));
          return { scenarioId: preset, ...req };
        });
        compareResults.value = await compareVanga(scenarios);
        result.value =
          compareResults.value.find((r) => r.scenarioId === form.value.preset)?.result ?? null;
      } else {
        const req = applyPresetMultiplier(form.value.preset, buildRequest());
        result.value = await simulateVanga(req);
        compareResults.value = [];
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Ошибка расчёта';
      result.value = null;
    } finally {
      simulating.value = false;
    }
  }, 400);

  watch(
    () => form.value.costItems,
    () => {
      if (!form.value.manualBurnOnly) {
        form.value.manualTotalBurn = totalBurn.value;
      }
    },
    { deep: true },
  );

  watch(form, () => void runSimulate(), { deep: true });
  watch(compareMode, () => void runSimulate());

  onMounted(async () => {
    try {
      const defaults = await fetchVangaDefaults();
      config.value = defaults.config;
      initFormFromConfig(defaults.config);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить defaults';
    } finally {
      loading.value = false;
      void runSimulate();
    }
  });

  return {
    loading,
    simulating,
    error,
    config,
    form,
    result,
    compareResults,
    compareMode,
    activeTab,
    referralModelOptions,
    enabledReferralModels,
    costItemKeys,
    oneTimeKeys,
    totalBurn,
    lastMonth,
    chartMaxNet,
    readRangeSpec,
    runSimulate,
  };
}
