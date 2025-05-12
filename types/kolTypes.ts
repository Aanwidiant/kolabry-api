export type NicheType =
  | "FASHION"
  | "BEAUTY"
  | "TECH"
  | "PARENTING"
  | "LIFESTYLE"
  | "FOOD"
  | "HEALTH"
  | "EDUCATION"
  | "FINANCIAL";

export type AgeRangeType =
  | "AGE_13_17"
  | "AGE_18_24"
  | "AGE_25_34"
  | "AGE_35_44"
  | "AGE_45_54"
  | "AGE_55_PLUS";

export interface KolInput {
  id: number;
  name: string;
  niche: NicheType;
  followers: number;
  engagement_rate: number;
  reach: number;
  rate_card: number;
  audience_male: number;
  audience_female: number;
  audience_age_range: AgeRangeType;
}
