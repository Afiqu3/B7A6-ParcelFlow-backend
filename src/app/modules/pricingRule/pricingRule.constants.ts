export const ZONE_TYPES = ["INSIDE_CITY", "SUB_CITY", "OUTSIDE_CITY"] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

export const PARCEL_CATEGORIES = ["DOCUMENT", "PARCEL"] as const;
export type ParcelCategory = (typeof PARCEL_CATEGORIES)[number];
