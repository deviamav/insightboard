import { z } from "zod";

export const periodSchema = z.enum([
  "today",
  "yesterday",
  "week",
  "lastWeek",
  "month",
  "lastMonth",
  "custom",
]);

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const periodTypeSchema = z.enum(["day", "week", "month"]);

export const geoSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[A-Za-z0-9_-]+$/)
  .transform((s) => s.toUpperCase());

export const geoFilterSchema = z
  .string()
  .regex(/^(ALL|[A-Z]{2,10})$/)
  .optional();

export const crBasisSchema = z.enum(["leads", "valids"]).default("leads");

export const statEntrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodType: periodTypeSchema.default("month"),
    geo: geoSchema,
    leads: z.coerce.number().int().min(0).max(1_000_000),
    invalids: z.coerce.number().int().min(0).max(1_000_000),
    deposits: z.coerce.number().int().min(0).max(1_000_000),
    offerName: z.string().max(100).optional().nullable(),
    noSend: z.coerce.number().int().min(0).max(1_000_000).optional(),
  })
  .refine((d) => d.invalids <= d.leads, {
    message: "invalids cannot exceed leads",
    path: ["invalids"],
  });

export const loginSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(256),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(8).max(256),
  role: z.enum(["admin", "user"]).default("user"),
});

export const updateUserPasswordSchema = z.object({
  id: z.string().min(1).max(64),
  password: z.string().min(8).max(256),
});

export const forceLogoutUserSchema = z.object({
  id: z.string().min(1).max(64),
  action: z.literal("logout"),
});

export const offerSchema = z.object({
  geo: geoSchema,
  title: z.string().max(120).optional().nullable(),
  payoutModel: z.enum(["CPL", "CPA", "CRG"]).default("CPL"),
  price: z.coerce.number().min(0).max(1_000_000),
  testPrice: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  crMin: z.coerce.number().min(0).max(100).optional().nullable(),
  crMax: z.coerce.number().min(0).max(100).optional().nullable(),
  crNote: z.string().max(100).optional().nullable(),
  funnels: z.array(z.string().min(1).max(64)).max(40).default([]),
  sources: z.array(z.string().min(1).max(80)).max(20).default([]),
  lpdMin: z.coerce.number().int().min(0).max(10_000).optional().nullable(),
  lpdMax: z.coerce.number().int().min(0).max(10_000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).optional(),
});

export const funnelMetaSchema = z.object({
  name: z.string().min(1).max(120),
  geo: z
    .string()
    .max(10)
    .optional()
    .nullable()
    .transform((s) => {
      if (!s || !s.trim()) return null;
      return s.trim().toUpperCase();
    }),
  description: z.string().max(5000).optional().nullable(),
  visibility: z.enum(["public", "private"]).optional(),
  isQuiz: z.boolean().optional().default(false),
});

const geoConfigSchema = z
  .object({
    geo: geoSchema,
    geoLabel: z.string().max(100).optional().nullable(),
    leads: z.coerce.number().int().min(0).max(1_000_000),
    invalids: z.coerce.number().int().min(0).max(1_000_000),
    deposits: z.coerce.number().int().min(0).max(1_000_000),
    buyerCount: z.coerce.number().int().min(1).max(20).optional(),
    todayLeads: z.coerce.number().int().min(0).max(1_000_000).optional(),
    todayInvalids: z.coerce.number().int().min(0).max(1_000_000).optional(),
    todayDeposits: z.coerce.number().int().min(0).max(1_000_000).optional(),
    skipWeekends: z.boolean().optional(),
    depositSchedule: z.enum(["daily", "alternate", "random"]).optional(),
    targetCr: z.coerce.number().min(0).max(100).optional(),
    crBasis: z.enum(["leads", "valids"]).optional(),
    periodLeads: z.coerce.number().int().min(0).max(10_000_000).optional(),
  })
    .refine(
      (d) => {
        if (d.periodLeads != null && d.periodLeads > 0 && d.leads === 0) {
          return d.invalids >= 0 && d.invalids <= 100;
        }
        return d.invalids <= d.leads;
      },
      { message: "invalids cannot exceed leads", path: ["invalids"] },
    )
  .refine(
    (d) => {
      const m =
        d.todayLeads === 0
          ? {
              leads: 0,
              invalids: d.todayInvalids ?? 0,
              deposits: d.todayDeposits ?? 0,
            }
          : {
              leads: d.todayLeads ?? d.leads,
              invalids: d.todayInvalids ?? d.invalids,
              deposits: d.todayDeposits ?? d.deposits,
            };
      const tl = m.leads;
      const ti = m.invalids;
      if (d.periodLeads != null && d.periodLeads > 0 && tl === 0) {
        return ti >= 0 && ti <= 100;
      }
      return ti <= tl;
    },
    { message: "today invalids cannot exceed today leads", path: ["todayInvalids"] },
  );

const templateBaseSchema = z.object({
  name: z.string().min(1).max(100),
  geo: geoSchema,
  geoLabel: z.string().max(100).optional().nullable(),
  periodType: periodTypeSchema.default("month"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leads: z.coerce.number().int().min(0).max(1_000_000),
  invalids: z.coerce.number().int().min(0).max(1_000_000),
  deposits: z.coerce.number().int().min(0).max(1_000_000),
  offerName: z.string().max(100).optional().nullable(),
  offers: z.array(z.string().min(1).max(100)).max(20).optional(),
  noSend: z.coerce.number().int().min(0).max(1_000_000).optional(),
  buyerName: z.string().max(100).optional().nullable(),
  buyerCount: z.coerce.number().int().min(1).max(20).optional(),
  geos: z.array(geoConfigSchema).min(1).max(12).optional(),
  apply: z.boolean().optional(),
});

export const templateSchema = templateBaseSchema.refine(
  (d) => d.invalids <= d.leads,
  { message: "invalids cannot exceed leads", path: ["invalids"] },
);

export const templateUpdateSchema = templateBaseSchema.partial().extend({
  apply: z.boolean().optional(),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}
