import z from 'zod';

export const DateTimeISO = z.string().datetime({ offset: true });

export const Money = z.object({
  amount: z.number().finite(),
  currency: z.literal('EUR')
});

export const PersonName = z.string().describe('Full name of the person with his titles');

export const Owner = z.object({
  people: z.array(PersonName).default([]),
  share: z.string().min(1).describe("Podiel, napr. '1/1' alebo '1/2'"),
});

/** ---- Ťarchy ---- */
export const Encumbrance = z.string().nullable().describe('Ťarcha, ak existuje');

export const Structure = z.object({
  supisneCislo: z.string().min(1),
  onParcelId: z.string().min(1),
  structureKind: z
    .string()
    .nullable()
    .describe("Druh stavby napr. 'Rodinný dom' alebo 'Ostatná stavba'"),
  description: z.string().nullable().describe("napr. 'rod.dom'")
});

export const Parcel = z.object({
  parcelNumber: z.string().min(1).describe("Parcelné číslo, napr. '353/1'"),
  parcelType: z.enum(['C', 'E']).describe("Either 'C' (for CKN) or 'E' (for EKN) parcels"),
  mapkaURL: z.string().describe('Mapka URL of the parcel'),
  city: z.string().describe('The city where the parcel is located'),
  areaM2: z.number().int().nonnegative(),
  landUseType: z
    .string()
    .nullable()
    .describe(
      "Druh pozemku napr. 'Lesný pozemok' alebo 'Záhradný pozemok' alebo 'Nezastavný pozemok' alebo 'Zastavný pozemok' alebo 'Ostatný pozemok'"
    ),
  landUseText: z
    .string()
    .nullable()
    .describe("Ľudský popis využitia, ak je dostupný napr. 'Pozemok s bytovou budovou' ")
});

export const Header = z.object({
  districtCode: z.any().nullable().describe("např. '507'")  , // např. "507"
  districtName: z.any().nullable().describe("napr. 'Námestovo'"), // "Námestovo"
  municipalityCode: z.any().nullable().describe("napr. '510203'"), // "510203"
  municipalityName: z.any().nullable().describe("napr. 'Zákamenné'"), // "Zákamenné"
  cadastralAreaCode: z.any().nullable().describe("napr. '871940'"), // "871940"
  cadastralAreaName: z.any().nullable().describe("napr. 'Zákamenné'"), // "Zákamenné"
  titleDeedNumber: z.any()// "1354"
});

/** ---- Rýchle štatistiky pre prvú stranu ---- */
export const QuickStats = z.object({
  parcelCount: z.number().int().nonnegative(),
  totalAreaM2: z.number().int().nonnegative(),
  structureCount: z.number().int().nonnegative(),
  ownerCount: z.number().int().positive()
});

export const processedTitleDeed = z.object({
  header: Header,
  parcel: Parcel,
  structures: z.array(Structure).default([]),
  owners: z.array(Owner).min(1),
  encumbrances: z.array(Encumbrance).default([])
});

/** ---- Hlavný sumár pre prvú stranu ---- */
export const titleDeedsForSummary = z
  .object({
    header: Header,
    quickStats: QuickStats,
    parcels: z
      .array(
        z
          .object({
            structures: z.array(Structure).default([]),
            owners: z.array(Owner).min(1),
            encumbrances: z.array(Encumbrance).default([])
          })
          .extend(Parcel.shape)
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    // jednoduchá kontrola konzistencie výmery
    const sum = data.parcels.reduce((a, p) => a + (p.areaM2 || 0), 0);
    if (data.quickStats.totalAreaM2 !== sum) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `quickStats.totalAreaM2 (${data.quickStats.totalAreaM2}) != súčet výmer parciel (${sum})`,
        path: ['quickStats', 'totalAreaM2']
      });
    }
  });

export type TitleDeedsForSummary = z.infer<typeof titleDeedsForSummary>;
export type QuickStats = z.infer<typeof QuickStats>;
export type Header = z.infer<typeof Header>;
export type Parcel = z.infer<typeof Parcel>;
export type Structure = z.infer<typeof Structure>;
export type Owner = z.infer<typeof Owner>;
export type Encumbrance = z.infer<typeof Encumbrance>;
export type ProcessedTitleDeed = z.infer<typeof processedTitleDeed>;
