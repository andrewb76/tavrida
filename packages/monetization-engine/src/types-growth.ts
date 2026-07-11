export type LinearGrowth = { registrationsPerMonth: number };
export type ExponentialGrowth = {
  registrationsMonth1: number;
  monthlyGrowthRatePercent: number;
};
export type LogisticGrowth = {
  carryingCapacity: number;
  inflectionMonth: number;
  steepness: number;
};

export type GrowthModel =
  | ({ type: 'linear' } & LinearGrowth)
  | ({ type: 'exponential' } & ExponentialGrowth)
  | ({ type: 'logistic_s_curve' } & LogisticGrowth);
