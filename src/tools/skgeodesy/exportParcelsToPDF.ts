import { z } from 'zod';
import { defineTool } from '../tool.js';
import { generateHtml, getCadastrialUnitCode, getParcelInfo, initializeBrowser } from './helpers.js';
import { createCKNCadastrialURL, createEKNCadastrialURL, createMapkaURL, saveHtmlToFile, saveParsedJsonToFile } from './utils.js';
import downloadsDir from 'downloads-folder'
import path from 'path';

const __downloadsDir = downloadsDir();

export const DateTimeISO = z.string().datetime({ offset: true });

export const Money = z.object({
  amount: z.number().finite(),
  currency: z.literal('EUR')
});

export const PersonName = z.string().describe('Full name of the person with his titles');

export const Owner = z.object({
  people: z.array(PersonName).default([]),
  share: z.string().min(1).describe("Podiel, napr. '1/1' alebo '1/2'"),
  maritalProperty: z.string().describe('Bezpodielové spoluvlastníctvo manželov vs. oddelené')
});

export const Parcel = z.object({
  parcelNumber: z.string().min(1).describe("Parcelné číslo, napr. '353/1'"),
  parcelType: z.enum(['C', 'E']).describe("Either 'C' (for CKN) or 'E' (for EKN) parcels"),
  city: z.string().describe('The city where the parcel is located'),
  areaM2: z.number().int().nonnegative(),
  landUseType: z
    .string()
    .optional()
    .describe(
      "Druh pozemku napr. 'Lesný pozemok' alebo 'Záhradný pozemok' alebo 'Nezastavný pozemok' alebo 'Zastavný pozemok' alebo 'Ostatný pozemok'"
    ),
  landUseText: z
    .string()
    .optional()
    .describe("Ľudský popis využitia, ak je dostupný napr. 'Pozemok s bytovou budovou' ")
});

export const Structure = z.object({
  supisneCislo: z.string().min(1),
  onParcelId: z.string().min(1),
  structureKind: z
    .string()
    .optional()
    .describe("Druh stavby napr. 'Rodinný dom' alebo 'Ostatná stavba'"),
  description: z.string().optional().describe("napr. 'rod.dom'")
});

/** ---- Ťarchy ---- */
export const Encumbrance = z.string().optional().describe('Ťarcha, ak existuje');

export const Header = z.object({
  districtCode: z.string().optional().describe("např. '507'"), // např. "507"
  districtName: z.string().optional().describe("napr. 'Námestovo'"), // "Námestovo"
  municipalityCode: z.string().optional().describe("napr. '510203'"), // "510203"
  municipalityName: z.string().optional().describe("napr. 'Zákamenné'"), // "Zákamenné"
  cadastralAreaCode: z.string().optional().describe("napr. '871940'"), // "871940"
  cadastralAreaName: z.string().optional().describe("napr. 'Zákamenné'"), // "Zákamenné"
  titleDeedNumber: z.string().min(1).describe("napr. '1354'") // "1354"
});

/** ---- Rýchle štatistiky pre prvú stranu ---- */
export const QuickStats = z.object({
  parcelCount: z.number().int().nonnegative(),
  totalAreaM2: z.number().int().nonnegative(),
  structureCount: z.number().int().nonnegative(),
  ownerCount: z.number().int().positive(),
  encumbrances: z.object({
    hasAny: z.boolean(),
    types: z.array(Encumbrance).default([])
  })
});

/** ---- Hlavný sumár pre prvú stranu ---- */
export const inputSchema = z
  .object({
    header: Header,
    quickStats: QuickStats,
    parcels: z.array(Parcel).min(1),
    structures: z.array(Structure).default([]),
    owners: z.array(Owner).min(1),
    encumbrances: z.array(Encumbrance).default([])
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
    // flag pre ťarchy
    const hasAny = data.encumbrances.length > 0;
    if (hasAny !== data.quickStats.encumbrances.hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `encumbrances.hasAny (${data.quickStats.encumbrances.hasAny}) nekorešponduje s počtom záznamov (${data.encumbrances.length}).`,
        path: ['quickStats', 'encumbrances', 'hasAny']
      });
    }
  });

const exportParcelsToPDF = defineTool({
  capability: 'kataster',

  schema: {
    name: 'export_parcels_to_pdf',
    title: 'Export Parcels to PDF',
    description: `Exports parcels to PDF`,
    inputSchema: inputSchema,
    type: 'readOnly'
  },

  handle: async (context, params, response) => {
    await saveParsedJsonToFile(params, 'params.json');
    const { parcels } = params;

    if (parcels.length === 0 || parcels[0].city === undefined) {
      response.addResult('No parcels to export or city is not provided');
      return;
    }

    await initializeBrowser({
      context,
      params,
      response
    });

    const cadastrialUnitCode = await getCadastrialUnitCode(parcels[0].city, {
      context,
      params,
      response
    });

    let parcelsInfo: any[] = [];

    const CKNParcels = parcels.filter((parcel) => parcel.parcelType === 'C');

    for (const parcel of CKNParcels) {
      const url = createCKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const html = await getParcelInfo(url, {
        context,
        params,
        response
      });
      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      parcelsInfo.push({
        parcelNumber: parcel.parcelNumber,
        parcelType: parcel.parcelType,
        html: html,
        mapkaURL: mapkaURL
      });
    }

    const EKNParcels = parcels.filter((parcel) => parcel.parcelType === 'E');

    for (const parcel of EKNParcels) {
      const url = createEKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const html = await getParcelInfo(url, {
        context,
        params,
        response
      });

      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      parcelsInfo.push({
        parcelNumber: parcel.parcelNumber,
        parcelType: parcel.parcelType,
        html: html,
        mapkaURL: mapkaURL
      });
    }

    const generatedHtml = generateHtml({
        ...params,
        lvs: parcelsInfo.map((parcel) => parcel.html?.toString() ?? ''),
        createdAt: new Date().toLocaleString()
    })

    saveHtmlToFile(generatedHtml, 'generated.html');

    try {
        // save generated html to pdf
        const tab = await context.ensureTab();
        await tab.page.setContent(generatedHtml, { waitUntil: 'load' });
        await tab.page.pdf({ path: path.join(__downloadsDir, 'generated.pdf') });
        response.addResult(`Generated PDF saved to ${path.join(__downloadsDir, 'generated.pdf')}`);
    } catch (error) {
        response.addError((error as Error).message);
    }

  }
});

export default [exportParcelsToPDF];
