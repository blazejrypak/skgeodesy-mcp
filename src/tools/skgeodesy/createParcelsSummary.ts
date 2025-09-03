import z from 'zod';
import { defineTool } from '../tool.js';
import {
  generateHtml,
  getCadastrialUnitCode,
  getParcelInfo,
  initializeBrowser
} from './helpers.js';
import { parsedTitleDeeds } from './schemas.js';
import { createCKNCadastrialURL, createEKNCadastrialURL, createMapkaURL } from './utils.js';

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

// First tool: Get parcel summary information
const createParcelsSummary = defineTool({
  capability: 'kataster',

  schema: {
    name: 'create_parcels_summary',
    title: 'Create Parcels Summary - Step 1',
    description: `Retrieves comprehensive property information for the given city and parcels from the Slovak Land Registry (Úrad geodézie, kartografie a katastra Slovenskej republiky)
     including property details, ownership records, buildings, land use classification, and legal encumbrances for specific parcel of type C (CKN) or E (EKN). 
     This is the first step in a two-step process. After getting the results, you should call the "process_title_deeds" tool with the structured data to generate the final resource.`,
    inputSchema: inputSchema1,
    type: 'readOnly'
  },

  handle: async (context, params, response) => {
    const { city, parcels } = params;
    context.clearStorage('parcelHtmlData');

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

    let parcelsInfo: any[] = [];
    const parcelHtmlStorage: Record<string, { mapkaURL: string, html: string }> = {};

    const CKNParcels = parcels.filter((parcel) => parcel.parcelType === 'C');

    for (const parcel of CKNParcels) {
      const url = createCKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const {html, text} = await getParcelInfo(url, {
        context,
        params,
        response
      });
      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      // Store HTML in context with a unique key
      const storageKey = `${parcel.parcelType}-${parcel.parcelNumber}`;
      parcelHtmlStorage[storageKey] = {
        mapkaURL: mapkaURL,
        html: html
      };

      parcelsInfo.push({
        parcelNumber: parcel.parcelNumber,
        parcelType: parcel.parcelType,
        mapkaURL: mapkaURL,
        text: text
      });
    }

    const EKNParcels = parcels.filter((parcel) => parcel.parcelType === 'E');

    for (const parcel of EKNParcels) {
      const url = createEKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const {html, text} = await getParcelInfo(url, {
        context,
        params,
        response
      });

      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      // Store HTML in context with a unique key
      const storageKey = `${parcel.parcelType}-${parcel.parcelNumber}`;
      parcelHtmlStorage[storageKey] = {
        mapkaURL: mapkaURL,
        html: html
      };

      parcelsInfo.push({
        parcelNumber: parcel.parcelNumber,
        parcelType: parcel.parcelType,
        mapkaURL: mapkaURL,
        text: text
      });
    }

    // Store all parcel HTML data in context
    context.setStorage('parcelHtmlData', parcelHtmlStorage);

    for (const parcelInfo of parcelsInfo) {
        response.addResult(
            `Parcel ${parcelInfo.parcelNumber} (${parcelInfo.parcelType}) info: ${parcelInfo.text} at ${parcelInfo.mapkaURL}`
        );
    }
  }
});

// Second tool: Process parsed title deeds and generate resource
const processTitleDeeds = defineTool({
  capability: 'kataster',

  schema: {
    name: 'process_title_deeds',
    title: 'Process Title Deeds - Step 2',
    description:
      'Processes parsed title deeds data and generates a comprehensive resource (summary, statistics, etc.). This is the second step in a two-step process. Use this after calling "create_parcels_summary" and structuring the data according to the parsedTitleDeeds schema.',
    inputSchema: parsedTitleDeeds,
    type: 'readOnly'
  },

  handle: async (context, params, response) => {
    // Retrieve HTML data from context
    const parcelHtmlData = context.getStorage('parcelHtmlData');
    if (!parcelHtmlData) {
      response.addError('No parcel HTML data found in context. Please run create_parcels_summary first.');
      return;
    }

    // Map parcels to their HTML data
    const lvs = params.parcels.map((parcel) => {
      const storageKey = `${parcel.parcelType}-${parcel.parcelNumber}`;
      return parcelHtmlData[storageKey]?.html || '';
    });

    const generatedHtml = generateHtml({
      ...params,
      lvs,
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

export default [createParcelsSummary, processTitleDeeds];
