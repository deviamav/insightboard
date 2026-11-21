import {
  addDaysISO,
  mondayOfWeekISO,
  previousMonthRangeISO,
  startOfMonthISO,
} from "./date-utils";
import type { Period } from "@/types/stats";

export function getPresetRange(
  period: Period,
  endDate: string,
): { dateFrom: string; dateTo: string } {
  switch (period) {
    case "today":
      return { dateFrom: endDate, dateTo: endDate };
    case "yesterday": {
      const y = addDaysISO(endDate, -1);
      return { dateFrom: y, dateTo: y };
    }
    case "week":
      return { dateFrom: mondayOfWeekISO(endDate), dateTo: endDate };
    case "lastWeek": {
      const mondayThis = mondayOfWeekISO(endDate);
      const sundayLast = addDaysISO(mondayThis, -1);
      return { dateFrom: addDaysISO(sundayLast, -6), dateTo: sundayLast };
    }
    case "month":
      return { dateFrom: startOfMonthISO(endDate), dateTo: endDate };
    case "lastMonth": {
      const range = previousMonthRangeISO(endDate);
      return { dateFrom: range.from, dateTo: range.to };
    }
    case "custom":
      return { dateFrom: endDate, dateTo: endDate };
  }
}
