import z from 'zod';
import { defineTool } from '../tool.js';
import getParcelC from './getParcelC.js';
import getParcelE from './getParcelE.js';
import { generateHtml, getCadastrialUnitCode, initializeBrowser } from './helpers.js';
import { QuickStats } from './schemas.js';
import { ParcelData } from './types.js';
import { saveParsedJsonToFile } from './utils.js';

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

    let parcelsInfo: ParcelData[] = [];

    const CKNParcels = parcels.filter((parcel) => parcel.parcelType === 'C');
    const EKNParcels = parcels.filter((parcel) => parcel.parcelType === 'E');

    const cknParcelsInfoPromises = CKNParcels.map(async (parcel) => {
      try {
        return await getParcelC({
          cadastralUnitCode: cadastrialUnitCode,
          parcelNumber: parcel.parcelNumber,
          toolParams: { context, params, response }
        });
      } catch (error) {
        response.addError(
          `Failed to process CKN parcel ${parcel.parcelNumber}: ${(error as Error).message}`
        );
        return null;
      }
    });

    const eknParcelsInfoPromises = EKNParcels.map(async (parcel) => {
      try {
        return await getParcelE({
          cadastralUnitCode: cadastrialUnitCode,
          parcelNumber: parcel.parcelNumber,
          toolParams: { context, params, response }
        });
      } catch (error) {
        response.addError(
          `Failed to process EKN parcel ${parcel.parcelNumber}: ${(error as Error).message}`
        );
        return null;
      }
    });

    const cknParcelsInfo = (await Promise.all(cknParcelsInfoPromises)).filter(
      (p) => p !== null
    ) as ParcelData[];
    const eknParcelsInfo = (await Promise.all(eknParcelsInfoPromises)).filter(
      (p) => p !== null
    ) as ParcelData[];

    parcelsInfo = [...cknParcelsInfo, ...eknParcelsInfo] as ParcelData[];

    const quickStats: QuickStats = parcelsInfo.reduce<QuickStats>(
      (acc, parcel) => {
        acc.parcelCount += 1; // Each processedTitleDeed represents one parcel
        acc.totalAreaM2 += parcel.metadata.Area || 0;
        // count unique owners by people array
        const allParcelOwners = Array.isArray(parcel.owners) ? parcel.owners.map((owner) => owner.Name).flat() : [];
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

    const header = {
      districtCode: parcelsInfo[0].metadata.DistrictId.toString() || null,
      districtName: parcelsInfo[0].metadata.DistrictId.toString() || null,
      municipalityCode: parcelsInfo[0].metadata.Municipality.Id.toString() || null,
      municipalityName: parcelsInfo[0].metadata.Municipality.Name.toString() || null,
      cadastralAreaCode: parcelsInfo[0].metadata.CadastralUnit.Code.toString() || null,
      cadastralAreaName: parcelsInfo[0].metadata.CadastralUnit.Name.toString() || null,
      titleDeedNumber: 'N/A'
    };

    const transformedParcels = parcelsInfo.map((parcel) => ({
      ...parcel,
      city: city,
      parcelNumber: parcel.parcelNumber,
      parcelType: parcel.parcelType,
      mapkaURL: parcel.mapkaURL,
      areaM2: parcel.metadata.Area || 0,
      landUseType: parcel.metadata.LandUse?.Name || null,
      landUseText: parcel.metadata.Utilisation?.Name || null,
      structures: [],
      owners: Array.isArray(parcel.owners) ? parcel.owners.map((owner) => ({
        people: [owner.Name],
        share: `${owner.Numerator}/${owner.Denominator}`
      })) : [],
      encumbrances: [],
      imagePreviewURL: parcel.imagePreviewURL
    }));

    const allTitleDeeds = {
      header,
      quickStats,
      parcels: transformedParcels
    };

    const fileName = `allTitleDeeds.json`;
    saveParsedJsonToFile(allTitleDeeds, fileName);

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
