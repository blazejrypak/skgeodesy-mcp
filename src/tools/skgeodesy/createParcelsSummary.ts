import { zodTextFormat } from 'openai/helpers/zod';
import z from 'zod';
import { defineTool } from '../tool.js';
import {
  generateHtml,
  getCadastrialUnitCode,
  getMetaDataJSON,
  getParcelInfo,
  initializeBrowser
} from './helpers.js';
import { ProcessedTitleDeed, processedTitleDeed, QuickStats } from './schemas.js';
import {
  createCKNCadastrialURL,
  createEKNCadastrialMetadataURL,
  createEKNCadastrialURL,
  createMapkaURL,
  saveParsedJsonToFile
} from './utils.js';

// First step: Get parcel information and mapka URLs
const inputSchema1 = z.object({
  city: z.string().describe('The city to get information about'),
  parcels: z.array(
    z.object({
      parcelType: z.enum(['C', 'E']).describe("Either 'C' (for CKN) or 'E' (for EKN) parcels"),
      parcelNumber: z.string().describe('Parcel number')
    })
  )
});

interface ParcelInfo {
  parcelNumber: string;
  parcelType: 'C' | 'E';
  mapkaURL: string;
  text: string;
  html: string;
  processedTitleDeed?: ProcessedTitleDeed;
}

// First tool: Get parcel summary information
const createParcelsSummary = defineTool({
  capability: 'kataster',

  schema: {
    name: 'create_parcels_summary',
    title: 'Create Parcels Summary - Step 1',
    description: `Retrieves comprehensive property information for the given city and parcels from the Slovak Land Registry (Úrad geodézie, kartografie a katastra Slovenskej republiky)
     including property details, ownership records, buildings, land use classification, and legal encumbrances for specific parcel of type C (CKN) or E (EKN). `,
    inputSchema: inputSchema1,
    type: 'readOnly'
  },

  handle: async (context, params, response) => {
    const { city, parcels } = params;

    await initializeBrowser({
      context,
      params,
      response
    });

    const cadastrialUnitCode = await getCadastrialUnitCode(city, {
      context,
      params,
      response
    });

    let parcelsInfo: ParcelInfo[] = [];

    const CKNParcels = parcels.filter((parcel) => parcel.parcelType === 'C');

    for (const parcel of CKNParcels) {
      const url = createCKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const { html, text } = await getParcelInfo(url, {
        context,
        params,
        response
      });
      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      parcelsInfo.push({
        parcelNumber: parcel.parcelNumber,
        parcelType: parcel.parcelType,
        mapkaURL: mapkaURL,
        text: text,
        html: html
      });
    }

    const EKNParcels = parcels.filter((parcel) => parcel.parcelType === 'E');

    for (const parcel of EKNParcels) {
      const metaDataUrl = createEKNCadastrialMetadataURL(cadastrialUnitCode, parcel.parcelNumber);
      const metaData = await getMetaDataJSON(metaDataUrl, {
        context,
        params,
        response
      });
      if (!metaData?.Folio?.No) {
        response.addError('No folio number found for parcel' + parcel.parcelType + ' ' + parcel.parcelNumber );
        continue;
      }
      const url = createEKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber, metaData.Folio.No);
      const { html, text } = await getParcelInfo(url, {
        context,
        params,
        response
      });

      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      parcelsInfo.push({
        parcelNumber: parcel.parcelNumber,
        parcelType: parcel.parcelType,
        mapkaURL: mapkaURL,
        text: text,
        html: html
      });
    }

    for (const parcelInfo of parcelsInfo) {
      const response = await context.openaiClient.responses.parse({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: `You are an expert at structured data extraction. 
            You will be given unstructured text from a research paper and should convert it into the given structure.`
          },
          { role: 'user', content: parcelInfo.text }
        ],
        text: {
          format: zodTextFormat(processedTitleDeed, 'processedTitleDeed')
        }
      });
      parcelInfo.processedTitleDeed = response.output_parsed!;
    }

    const processedTitleDeeds = parcelsInfo
      .map((parcel) => parcel.processedTitleDeed!)
      .filter(Boolean);

    // save to file processedTitleDeeds
    const fileName = `processedTitleDeeds-${new Date().toISOString()}.json`;
    saveParsedJsonToFile(processedTitleDeeds, fileName);

    const quickStats: QuickStats = processedTitleDeeds.reduce<QuickStats>(
      (acc, parcel) => {
        acc.parcelCount += 1; // Each processedTitleDeed represents one parcel
        acc.totalAreaM2 += parcel.parcel.areaM2 || 0;
        acc.structureCount += parcel.structures.length;
        // count unique owners by people array
        const allParcelOwners = parcel.owners.map((owner) => owner.people).flat();
        acc.ownerCount += new Set(allParcelOwners).size;
        return acc;
      },
      {
        parcelCount: 0,
        totalAreaM2: 0,
        structureCount: 0,
        ownerCount: 0
      }
    );

    const header = processedTitleDeeds[0].header;
    const _parcels = processedTitleDeeds.map((titleDeed) => ({
      structures: titleDeed.structures,
      owners: titleDeed.owners,
      encumbrances: titleDeed.encumbrances,
      ...titleDeed.parcel
    }));

    const allTitleDeeds = {
      header,
      quickStats,
      parcels: _parcels
    };

    const generatedHtml = generateHtml({
      ...allTitleDeeds,
      lvs: parcelsInfo.map((parcel) => parcel.html),
      createdAt: new Date().toLocaleString()
    });

    try {
      // save generated html to pdf
      const tab = await context.ensureTab();
      await tab.page.setContent(generatedHtml, { waitUntil: 'load' });
      const fileName = await tab.context.outputFile(`summary-${new Date().toISOString()}.pdf`);
      response.addResult(`Generated PDF saved to ${fileName}`);
      await tab.page.pdf({ path: fileName });
    } catch (error) {
      response.addError((error as Error).message);
    }
  }
});

export default [createParcelsSummary];