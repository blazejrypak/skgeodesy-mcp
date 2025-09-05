const MAPKA_BASE_URL = 'https://zbgis.skgeodesy.sk';
const MAPKA_API_URL = `${MAPKA_BASE_URL}/mapka/api`;
const MAPKA_API_SUGGEST_URL = `${MAPKA_API_URL}/suggest/kataster`;

const CADASTRIAL_BASE_URL = 'https://kataster.skgeodesy.sk';

const CAPTCHA_URL = `${CADASTRIAL_BASE_URL}/Portal45/api/Bo/GeneratePrfPublic`;

const CADASTRIAL_API_URL_CKNParcels = `${CADASTRIAL_BASE_URL}/Portal45/api/Bo/GeneratePrfPublic`;

const CADASTRIAL_API_URL_EKNParcels = `${CADASTRIAL_BASE_URL}/PortalODataPublic/ParcelsE`;
const CADASTRIAL_API_URL_CKNParcels_Metadata = `${CADASTRIAL_BASE_URL}/PortalODataPublic/ParcelsC`;

export {
    MAPKA_BASE_URL,
    MAPKA_API_URL,
    MAPKA_API_SUGGEST_URL,
    CADASTRIAL_BASE_URL,
    CAPTCHA_URL,
    CADASTRIAL_API_URL_CKNParcels, 
    CADASTRIAL_API_URL_EKNParcels,
    CADASTRIAL_API_URL_CKNParcels_Metadata,
};
