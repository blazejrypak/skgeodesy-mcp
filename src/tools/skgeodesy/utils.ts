import removeAccents from 'remove-accents';
import {
    CADASTRIAL_API_URL_CKNParcels,
    CADASTRIAL_API_URL_EKNParcels,
    MAPKA_API_SUGGEST_URL,
    MAPKA_BASE_URL
} from './constants.js';

const createCadastrialUnitCodeUrl = (city: string) => {
    return `${MAPKA_API_SUGGEST_URL}?q=${encodeURIComponent(removeAccents(city))}`;
};

const createMapkaURL = (cadastralUnitCode: string, parcelNumber: string, parcelType: string) => {
    return `${MAPKA_BASE_URL}/mapka/sk/kataster/detail/kataster/parcela-${parcelType.toLowerCase()}/${cadastralUnitCode}/${parcelNumber.replace('/', '_')}`;
};

const createCKNCadastrialURL = (cadastralUnitCode: string, parcelNumber: string) => {
    return `${CADASTRIAL_API_URL_CKNParcels}?cadastralUnitCode=${encodeURIComponent(cadastralUnitCode)}&filter=parcelsC:${encodeURIComponent(parcelNumber)};&outputType=html`;
};

const createEKNCadastrialURL = (cadastralUnitCode: string, parcelNumber: string) => {
    return (
        `${CADASTRIAL_API_URL_EKNParcels}?$select=Id,ValidTo,No,NoFull,Area,Extent` +
        '&$expand=OwnershipType($select=Name,Code),CadastralUnit($select=Name,Code),Localization($select=Name),Municipality($select=Name),' +
        'LandUse($select=Name),SharedProperty($select=Name),Folio($select=Id,No,CountOfParcelsE),Status($select=Code),OriginalCadastralUnit($select=Name,Code,Value)' +
        `&$filter=CadastralUnit/Code%20eq%20${cadastralUnitCode}%20and%20NoFull%20eq%20%27${parcelNumber}%27&callback=ng_jsonp_callback_1`
    );
};

export { createCadastrialUnitCodeUrl, createMapkaURL, createCKNCadastrialURL, createEKNCadastrialURL };
