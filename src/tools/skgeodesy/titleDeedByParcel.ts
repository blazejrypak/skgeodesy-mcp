import z from 'zod';
import { defineTool } from '../tool.js';
import { getCadastrialUnitCode, getParcelInfo, initializeBrowser } from './helpers.js';
import { createCKNCadastrialURL, createEKNCadastrialURL, createMapkaURL } from './utils.js';

const inputSchema = z.object({
  city: z.string().describe('The city to get information about'),
  parcel: z.object({
    parcelType: z.enum(['C', 'E']).describe("Either 'C' (for CKN) or 'E' (for EKN) parcels"),
    parcelNumber: z.string().describe('Parcel number')
  })
});

const titleDeedByParcel = defineTool({
  capability: 'kataster',

  schema: {
    name: 'title_deed_by_parcel',
    title: 'Slovak Land Registry Property Extract by Parcel',
    description: `Retrieves comprehensive property information from the Slovak Land Registry (Úrad geodézie, kartografie a katastra Slovenskej republiky)
     including property details, ownership records, buildings, land use classification, and legal encumbrances for specific parcel of type C (CKN) or E (EKN)`,
    inputSchema: inputSchema,
    type: 'readOnly'
  },

  handle: async (context, params, response) => {
    const { city, parcel } = params;

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

    const isCKNParcel = parcel.parcelType === 'C';

    if (isCKNParcel) {
      const url = createCKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const html = await getParcelInfo(url, {
        context,
        params,
        response
      });
      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);
      response.addResult(
        `Parcel ${parcel.parcelNumber} (${parcel.parcelType}) info: ${html} at ${mapkaURL}`
      );
    } else {
      const url = createEKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
      const html = await getParcelInfo(url, {
        context,
        params,
        response
      });

      const mapkaURL = createMapkaURL(cadastrialUnitCode, parcel.parcelNumber, parcel.parcelType);

      response.addResult(
        `Parcel ${parcel.parcelNumber} (${parcel.parcelType}) info: ${html} at ${mapkaURL}`
      );
    }
  }
});

export default [titleDeedByParcel];