import type { KolInput, NicheType, AgeRangeType } from "../types/kolTypes.ts";

export function validateKol(data: Partial<KolInput>) {
  const requiredFields: (keyof KolInput)[] = [
    "id",
    "name",
    "niche",
    "followers",
    "engagement_rate",
    "reach",
    "rate_card",
    "audience_male",
    "audience_female",
    "audience_age_range",
  ];

  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null) {
      return { valid: false, message: `${field} is required.` };
    }
  }

  const NicheTypes: NicheType[] = [
    "FASHION",
    "BEAUTY",
    "TECH",
    "PARENTING",
    "LIFESTYLE",
    "FOOD",
    "HEALTH",
    "EDUCATION",
    "FINANCIAL",
  ];

  const AgeRangeTypes: AgeRangeType[] = [
    "AGE_13_17",
    "AGE_18_24",
    "AGE_25_34",
    "AGE_35_44",
    "AGE_45_54",
    "AGE_55_PLUS",
  ];

  if (typeof data.id !== "number")
    return { valid: false, message: "id must be a number." };

  if (typeof data.name !== "string")
    return { valid: false, message: "name must be a string." };

  if (!NicheTypes.includes(data.niche!))
    return {
      valid: false,
      message: `niche must be one of: ${NicheTypes.join(", ")}`,
    };

  if (typeof data.followers !== "number")
    return { valid: false, message: "followers must be a number." };

  if (typeof data.engagement_rate !== "number")
    return { valid: false, message: "engagement_rate must be a number." };

  if (typeof data.reach !== "number")
    return { valid: false, message: "reach must be a number." };

  if (typeof data.rate_card !== "number")
    return { valid: false, message: "rate_card must be a number." };

  if (typeof data.audience_male !== "number")
    return { valid: false, message: "audience_male must be a number." };

  if (typeof data.audience_female !== "number")
    return { valid: false, message: "audience_female must be a number." };

  if (!AgeRangeTypes.includes(data.audience_age_range!))
    return {
      valid: false,
      message: `audience_age_range must be one of: ${AgeRangeTypes.join(", ")}`,
    };

  return { valid: true };
}
