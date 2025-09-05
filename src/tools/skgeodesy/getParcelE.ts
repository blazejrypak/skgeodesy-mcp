import { createParcelImagePreviewURL, fetchJson, getMetadata, getParcelInfo } from './helpers.js';
import { Owner, Parcel, ParcelData, ToolParams } from './types.js';
import { createEKNCadastrialURL, createMapkaURL } from './utils.js';

interface GetParcelCParams {
  cadastralUnitCode: string;
  parcelNumber: string;
  toolParams: ToolParams;
}

const createParcelGenericMetadataURL = (cadastralUnitCode: string, parcelNumber: string) => {
  return `https://kataster.skgeodesy.sk/PortalODataPublic/ParcelsE?$select=&$expand=OwnershipType($select=),CadastralUnit($select=),Localization($select=),Municipality($select=),LandUse($select=),SharedProperty($select=),Folio($select=),Status($select=),OriginalCadastralUnit($select=)&$filter=CadastralUnit/Code%20eq%20${cadastralUnitCode}%20and%20NoFull%20eq%20%27${parcelNumber}%27&callback=ng_jsonp_callback_4`;
};

const createParcelOwnersMetadataURL = (id:number) => {
  return `https://kataster.skgeodesy.sk/PortalODataPublic/ParcelsE(${id})/Kn.Participants?$filter=Type/Code%20eq%201&$select=&$expand=OwnershipRecord($select=)&$orderby=OwnershipRecord/Order&$skip=0&callback=ng_jsonp_callback_4`
};

const createParcelLayerDefsIdURL = (id:number) => {
  return `https://kataster.skgeodesy.sk/GisPortal45/api/odata?url=/%252FParcelsE(${id})%253F%2524select%253DId%252CExtent`
}

const getParcelE = async (params: GetParcelCParams): Promise<ParcelData> => {
  const { cadastralUnitCode, parcelNumber, toolParams } = params;
  const genericMetadataUrl = createParcelGenericMetadataURL(cadastralUnitCode, parcelNumber);
  const genericMetadata = await getMetadata(genericMetadataUrl, toolParams) as Parcel;
  const ownersMetadataUrl = createParcelOwnersMetadataURL(genericMetadata.Id);
  const ownersMetadata = await getMetadata(ownersMetadataUrl, toolParams) as Owner[];
  const mapkaURL = createMapkaURL(cadastralUnitCode, parcelNumber, 'E');
  const url = createEKNCadastrialURL(cadastralUnitCode, parcelNumber, genericMetadata.Folio.No.toString());
  const html = await getParcelInfo(url, toolParams)
  const layerDefsIdUrl = createParcelLayerDefsIdURL(genericMetadata.Id);
  const layerDefsInfo = await fetchJson(layerDefsIdUrl, toolParams) as any;
  const imagePreviewURL = createParcelImagePreviewURL(genericMetadata.Extent, 'E', layerDefsInfo.Id);
  return {
    parcelNumber: parcelNumber,
    parcelType: 'E',
    mapkaURL: mapkaURL,
    imagePreviewURL: imagePreviewURL,
    metadata: genericMetadata,
    owners: ownersMetadata,
    html: html
  } as ParcelData;
};

export default getParcelE;
