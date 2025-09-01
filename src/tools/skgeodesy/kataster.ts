/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
        title: 'Slovak Land Registry Information',
        description:
            'Provides information about land parcels and property records from the Slovak Land Registry (Kataster)',
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
