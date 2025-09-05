import { createParcelImagePreviewURL, fetchJson, getMetadata, getParcelInfo } from './helpers.js';
import { Building, Owner, Parcel, ParcelDataC, ToolParams } from './types.js';
import { createCKNCadastrialURL, createMapkaURL } from './utils.js';

interface GetParcelCParams {
  cadastralUnitCode: string;
  parcelNumber: string;
  toolParams: ToolParams;
}

const createParcelGenericMetadataURL = (cadastralUnitCode: string, parcelNumber: string) => {
  return `https://kataster.skgeodesy.sk/PortalODataPublic/ParcelsC?$select=&$expand=OwnershipType($select=),CadastralUnit($select=),Localization($select=),Municipality($select=),LandUse($select=),SharedProperty($select=),Affiliation($select=),Folio($select=),Utilisation($select=),Status($select=)&$filter=CadastralUnit/Code%20eq%20${cadastralUnitCode}%20and%20No%20eq%20%27${parcelNumber}%27&callback=ng_jsonp_callback_4`;
};

const createParcelOwnersMetadataURL = (id:number) => {
  return `https://kataster.skgeodesy.sk/PortalODataPublic/ParcelsC(${id})/Kn.Participants?$filter=Type/Code%20eq%201&$select=&$expand=OwnershipRecord($select=)&$orderby=OwnershipRecord/Order&$skip=0&callback=ng_jsonp_callback_4`;
};

const createParcelConstructionsMetadataURL = (id:number) => {
  return `https://kataster.skgeodesy.sk/PortalODataPublic/Constructions?$filter=ParcelsC/any(p:%20p/Id%20eq%20${id})&$orderby=CadastralUnit/Code,HouseNo&$expand=Folio($select=),OwnershipRecord($select=)&$skip=0&callback=ng_jsonp_callback_4`
}

const createParcelLayerDefsIdURL = (id:number) => {
  return `https://kataster.skgeodesy.sk/GisPortal45/api/odata?url=/%252FParcelsC(${id})%253F%2524select%253DId%252CExtent`
}

const getParcelC = async (params: GetParcelCParams): Promise<ParcelDataC> => {
  const { cadastralUnitCode, parcelNumber, toolParams } = params;
  const genericMetadataUrl = createParcelGenericMetadataURL(cadastralUnitCode, parcelNumber);
  const genericMetadata = await getMetadata(genericMetadataUrl, toolParams) as Parcel;
  const ownersMetadataUrl = createParcelOwnersMetadataURL(genericMetadata.Id);
  const ownersMetadata = await getMetadata(ownersMetadataUrl, toolParams) as Owner[];
  const constructionsMetadataUrl = createParcelConstructionsMetadataURL(genericMetadata.Id);
  const constructionsMetadata = await getMetadata(constructionsMetadataUrl, toolParams) as Building[];
  const mapkaURL = createMapkaURL(cadastralUnitCode, parcelNumber, 'C');
  const url = createCKNCadastrialURL(cadastralUnitCode, parcelNumber);
  const html = await getParcelInfo(url, toolParams)
  const layerDefsIdUrl = createParcelLayerDefsIdURL(genericMetadata.Id);
  const layerDefsInfo = await fetchJson(layerDefsIdUrl, toolParams) as any;
  const imagePreviewURL = createParcelImagePreviewURL(genericMetadata.Extent, 'C', layerDefsInfo.Id);
  return {
    parcelNumber: parcelNumber,
    parcelType: 'C',
    mapkaURL: mapkaURL,
    imagePreviewURL: imagePreviewURL,
    metadata: genericMetadata,
    owners: ownersMetadata,
    html: html,
    buildings: constructionsMetadata
  }
};

export default getParcelC;
