import { z } from 'zod';
import { defineTool } from '../tool.js';
import { getCadastrialUnitCode, getParcelInfo, initializeBrowser } from './helpers.js';
import { createCKNCadastrialURL, createEKNCadastrialURL, createMapkaURL } from './utils.js';

const katasterSchema = z.object({
    city: z.string().describe('The city to get information about'),
    parcels: z.array(
        z.object({
            parcelType: z
                .enum(['C', 'E'])
                .describe("Either 'C' (for CKN) or 'E' (for EKN) parcels"),
            parcelNumber: z.string().describe('Parcel number')
        })
    )
});

const kataster = defineTool({
    capability: 'kataster',

    schema: {
        name: 'slovak_land_registry_info',
        title: 'Slovak Land Registry Property Extract by multiple Parcels',
        description:
            `Retrieves comprehensive property information from the Slovak Land Registry (Úrad geodézie, kartografie a katastra Slovenskej republiky)
     including property details, ownership records, buildings, land use classification, and legal encumbrances for specific parcel of type C (CKN) or E (EKN)`,
        inputSchema: katasterSchema,
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

        let parcelsInfo: any[] = [];

        const CKNParcels = parcels.filter((parcel) => parcel.parcelType === 'C');

        for (const parcel of CKNParcels) {
            const url = createCKNCadastrialURL(cadastrialUnitCode, parcel.parcelNumber);
            const parcelInfo = await getParcelInfo(url, {
                context,
                params,
                response
            });
            const mapkaURL = createMapkaURL(
                cadastrialUnitCode,
                parcel.parcelNumber,
                parcel.parcelType
            );

            parcelsInfo.push({
                parcelNumber: parcel.parcelNumber,
                parcelType: parcel.parcelType,
                parcelInfo: parcelInfo,
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

            const mapkaURL = createMapkaURL(
                cadastrialUnitCode,
                parcel.parcelNumber,
                parcel.parcelType
            );

            parcelsInfo.push({
                parcelNumber: parcel.parcelNumber,
                parcelType: parcel.parcelType,
                html: html,
                mapkaURL: mapkaURL
            });
        }

        for (const parcelInfo of parcelsInfo) {
            response.addResult(
                `Parcel ${parcelInfo.parcelNumber} (${parcelInfo.parcelType}) info: ${parcelInfo.html} at ${parcelInfo.mapkaURL}`
            );
        }
    }
});

export default [kataster];
