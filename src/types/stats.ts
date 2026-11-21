export type Period =
  | "today"
  | "yesterday"
  | "week"
  | "lastWeek"
  | "month"
  | "lastMonth"
  | "custom";
export type PeriodType = "day" | "week" | "month";
export type CrBasis = "leads" | "valids";
export type GeoCode = "ALL" | "KZ" | "TR" | "UZ";

export interface StatsFilters {
  period?: Period;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  geo?: string;
  crBasis?: CrBasis;
}

export interface DashboardStats {
  totals: {
    leads: number;
    valids: number;
    invalids: number;
    deposits: number;
    cr: number;
    profit: number;
  };
  geo: Array<{
    code: string;
    total: number;
    valid: number;
    invalid: number;
    deposit: number;
  }>;
  topBuyers: Array<{
    name: string;
    geo: string;
    leads: number;
    deposits: number;
    conversion: number;
  }>;
  hourlyChart: Array<{
    hour: string;
    leads: number;
    deposits: number;
    duplicates: number;
  }>;
  qualityChart: Array<{
    name: string;
    value: number;
    percent: number;
  }>;
  qualityTotal: number;
}

export interface OfferRow {
  name: string;
  total: number;
  valid: number;
  invalid: number;
  noSend: number;
  invalidPercent: number;
  deposits: number;
  conversion: number;
}
