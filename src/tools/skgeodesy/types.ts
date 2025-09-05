import { Context } from '../../context.js';
import { type Response } from '../../response.js';
import { z } from 'zod';

export type ToolParams = {
  context: Context;
  params: z.output<z.Schema>;
  response: Response;
};

const ExtentSchema = z
  .object({
    Xmin: z.number().describe('Minimum X coordinate'),
    Ymin: z.number().describe('Minimum Y coordinate'),
    Xmax: z.number().describe('Maximum X coordinate'),
    Ymax: z.number().describe('Maximum Y coordinate')
  })
  .describe('Geographical extent boundaries');

const BaseEntitySchema = z
  .object({
    Id: z.number().describe('Unique identifier'),
    Code: z.number().describe('Entity code'),
    Name: z.string().describe('Entity name'),
    ValidTo: z.string().datetime().describe('Validity end date')
  })
  .describe('Base entity with ID, code, name, and validity');

const CadastralUnitSchema = z
  .object({
    Id: z.number().describe('Cadastral unit identifier'),
    Code: z.number().describe('Cadastral unit code'),
    Name: z.string().describe('Cadastral unit name'),
    MunicipalityId: z.number().describe('Related municipality ID'),
    Search: z.string().describe('Search-friendly string'),
    Extent: ExtentSchema.describe('Geographical extent of cadastral unit'),
    ValidTo: z.string().datetime().describe('Validity end date')
  })
  .describe('Cadastral unit information');

const MunicipalitySchema = z
  .object({
    Id: z.number().describe('Municipality identifier'),
    Code: z.string().describe('Municipality code'),
    Name: z.string().describe('Municipality name'),
    DistrictId: z.number().describe('District identifier'),
    Search: z.string().describe('Search-friendly string'),
    Extent: ExtentSchema.describe('Municipality extent'),
    ValidTo: z.string().datetime().describe('Validity end date'),
    AdministrationUnitId: z.number().describe('Administration unit ID')
  })
  .describe('Municipality information');

const FolioSchema = z
  .object({
    Id: z.number().describe('Folio identifier'),
    No: z.number().describe('Folio number'),
    OwnersCount: z.number().describe('Number of owners'),
    CountOfParcelsC: z.number().describe('Count of C-type parcels'),
    CountOfParcelsE: z.number().describe('Count of E-type parcels'),
    CadastralUnitId: z.number().describe('Cadastral unit ID'),
    ValidTo: z.string().datetime().describe('Validity end date'),
    IdentificationDate: z.string().datetime().describe('Identification date'),
    IdentificationTypeId: z.number().describe('Identification type ID'),
    HasCaveats: z.boolean().describe('Indicates whether folio has caveats')
  })
  .describe('Folio details');

export const ParcelSchemaC = z
  .object({
    Id: z.number().describe('Parcel identifier'),
    No: z.string().describe('Parcel number'),
    CadastralUnitId: z.number().describe('Cadastral unit ID'),
    Area: z.number().describe('Declared area'),
    GeodeticArea: z.number().describe('Geodetically measured area'),
    FolioId: z.number().describe('Folio ID'),
    LandUseId: z.number().describe('Land use ID'),
    ProtectedPropertyId: z.number().describe('Protected property ID'),
    UtilisationId: z.number().describe('Utilisation ID'),
    HouseNo: z.number().describe('House number (if applicable)'),
    LocalizationId: z.number().describe('Localization ID'),
    OwnershipTypeId: z.number().describe('Ownership type ID'),
    AffiliationId: z.number().describe('Affiliation ID'),
    SharedPropertyId: z.number().describe('Shared property ID'),
    LandUseDifferenceId: z.number().describe('Land use difference ID'),
    MapId: z.number().describe('Map ID'),
    StatusId: z.number().describe('Status ID'),
    Extent: ExtentSchema.describe('Parcel extent'),
    RegionId: z.number().describe('Region ID'),
    DistrictId: z.number().describe('District ID'),
    MunicipalityId: z.number().describe('Municipality ID'),
    ValidTo: z.string().datetime().describe('Parcel validity end date'),
    NoSort: z.number().describe('Sortable parcel number'),
    ProtectedPropertyCodes: z.array(z.any()).describe('List of protected property codes'),
    ProtectedPropertyNames: z.array(z.any()).describe('List of protected property names'),

    OwnershipType: BaseEntitySchema.describe('Ownership type details'),
    CadastralUnit: CadastralUnitSchema.describe('Cadastral unit details'),
    Localization: BaseEntitySchema.describe('Localization details'),
    Municipality: MunicipalitySchema.describe('Municipality details'),
    LandUse: BaseEntitySchema.describe('Land use details'),
    SharedProperty: BaseEntitySchema.describe('Shared property details'),
    Affiliation: BaseEntitySchema.describe('Affiliation details'),
    Folio: FolioSchema.describe('Folio details'),
    Utilisation: BaseEntitySchema.describe('Utilisation details'),
    Status: BaseEntitySchema.describe('Parcel status details')
  })
  .describe('Land parcel information schema');

const OwnershipRecordSchema = z
  .object({
    Id: z.number().describe('Ownership record identifier'),
    FolioId: z.number().describe('Folio identifier linked to the record'),
    Order: z.number().describe('Order of the ownership record'),
    ValidTo: z.string().datetime().describe('Validity end date of ownership record')
  })
  .describe('Ownership record details');

export const OwnerSchema = z
  .object({
    Id: z.number().describe('Owner identifier'),
    OwnershipRecordId: z.number().describe('Linked ownership record ID'),
    Numerator: z.number().describe('Ownership share numerator'),
    Denominator: z.number().describe('Ownership share denominator'),
    Name: z.string().describe('Full owner name with address'),
    OwnerTypeId: z.number().describe('Type of owner identifier'),
    TypeId: z.number().describe('Subtype of ownership'),
    NatureId: z.number().describe('Nature of ownership (may be negative if unspecified)'),
    Notes: z.string().nullable().describe('Optional notes about the ownership'),
    ValidTo: z.string().datetime().describe('Validity end date of the ownership entry'),
    CadastralUnitId: z.number().describe('Cadastral unit identifier'),
    MunicipalityId: z.number().describe('Municipality identifier'),
    SubjectIds: z.array(z.any()).describe('List of linked subject IDs'),
    SubjectIdNos: z.array(z.any()).describe('List of subject ID numbers'),

    OwnershipRecord: OwnershipRecordSchema.describe('Ownership record details')
  })
  .describe('Land ownership entry schema');

export const ParcelSchemaE = z.object({
  Id: z.number().describe('Parcel identifier'),
  No: z.string().describe('Parcel number'),
  CadastralUnitId: z.number().describe('Cadastral unit ID'),
  Area: z.number().describe('Declared area'),
  GeodeticArea: z.number().describe('Geodetically measured area'),
  FolioId: z.number().describe('Folio ID'),
  LandUseId: z.number().describe('Land use ID'),
  ProtectedPropertyId: z.number().describe('Protected property ID'),
  UtilisationId: z.number().describe('Utilisation ID'),
  HouseNo: z.number().describe('House number (if applicable)'),
  LocalizationId: z.number().describe('Localization ID'),
  OwnershipTypeId: z.number().describe('Ownership type ID'),
  AffiliationId: z.number().describe('Affiliation ID'),
  SharedPropertyId: z.number().describe('Shared property ID'),
  LandUseDifferenceId: z.number().describe('Land use difference ID'),
  MapId: z.number().describe('Map ID'),
  StatusId: z.number().describe('Status ID'),
  Extent: ExtentSchema.describe('Parcel extent'),
  RegionId: z.number().describe('Region ID'),
  DistrictId: z.number().describe('District ID'),
  MunicipalityId: z.number().describe('Municipality ID'),
  ValidTo: z.string().datetime().describe('Parcel validity end date'),
  NoSort: z.number().describe('Sortable parcel number'),
  ProtectedPropertyCodes: z.array(z.any()).describe('List of protected property codes'),
  ProtectedPropertyNames: z.array(z.any()).describe('List of protected property names'),

  OwnershipType: BaseEntitySchema.describe('Ownership type details'),
  CadastralUnit: CadastralUnitSchema.describe('Cadastral unit details'),
  Localization: BaseEntitySchema.describe('Localization details'),
  Municipality: MunicipalitySchema.describe('Municipality details'),
  LandUse: BaseEntitySchema.describe('Land use details'),
  SharedProperty: BaseEntitySchema.describe('Shared property details'),
  Affiliation: BaseEntitySchema.describe('Affiliation details'),
  Folio: FolioSchema.describe('Folio details'),
  Utilisation: BaseEntitySchema.describe('Utilisation details'),
  Status: BaseEntitySchema.describe('Parcel status details'),

  NoFull: z.string().describe('Full parcel number'),
  OriginalCadastralUnitId: z.number().nullable().describe('Original cadastral unit ID'),
  OriginalCadastralUnitCode: z.number().describe('Original cadastral unit code'),
  OriginalCadastralUnit: z.null().describe('Original cadastral unit details')
});

export const BuildingSchema = z.object({
  Id: z.number().describe("Building identifier"),
  FolioId: z.number().describe("Folio (ownership record) identifier"),
  HouseNo: z.number().describe("House number"),
  Area: z.number().describe("Building area in square meters"),
  Description: z.string().describe("Building description"),
  LocalizationId: z.number().describe("Localization identifier"),
  TypeId: z.number().describe("Building type identifier"),
  ProtectedPropertyId: z.number().describe("Protected property identifier"),
  Search: z.string().describe("Search key (usually house number or description)"),
  RegionId: z.number().describe("Region identifier"),
  DistrictId: z.number().describe("District identifier"),
  MunicipalityId: z.number().describe("Municipality identifier"),
  CadastralUnitId: z.number().describe("Cadastral unit identifier"),
  Extent: ExtentSchema,
  ValidTo: z.string().datetime().describe("Validity end date"),
  SitePart: z.number().describe("Site part identifier"),
  ParcelCIds: z.array(z.number()).describe("List of related parcel C identifiers"),
  ParcelCNos: z.array(z.string()).describe("List of related parcel C numbers"),
  Folio: FolioSchema,
}).describe("Building entity with cadastral, legal, and geometric details");

export type Parcel = z.infer<typeof ParcelSchemaC | typeof ParcelSchemaE>;
export type Owner = z.infer<typeof OwnerSchema>;
export type Building = z.infer<typeof BuildingSchema>;

export const ParcelDataCSchema = z.object({
  parcelType: z.literal("C").describe("Parcel type C"),
  parcelNumber: z.string().describe("Parcel number"),
  mapkaURL: z.string().describe("Mapka URL"),
  imagePreviewURL: z.string().describe("Image preview URL"),
  metadata: ParcelSchemaC,
  owners: z.array(OwnerSchema),
  buildings: z.array(BuildingSchema).nullable().describe("C-type parcels do not have buildings"),
  html: z.string().describe("HTML content"),
});

export const ParcelDataESchema = z.object({
  parcelType: z.literal("E").describe("Parcel type E"),
  parcelNumber: z.string().describe("Parcel number"),
  mapkaURL: z.string().describe("Mapka URL"),
  imagePreviewURL: z.string().describe("Image preview URL"),
  metadata: ParcelSchemaE,
  owners: z.array(OwnerSchema),
  buildings: z.array(BuildingSchema).nullable().describe("E-type parcels may include buildings"),
  html: z.string().describe("HTML content"),
});

export const ParcelDataSchema = z.discriminatedUnion("parcelType", [
  ParcelDataCSchema,
  ParcelDataESchema,
]).describe("Parcel data (C or E type)");

// 3) Inferred TS types
export type ParcelData = z.infer<typeof ParcelDataSchema>;
export type ParcelDataC = z.infer<typeof ParcelDataCSchema>;
export type ParcelDataE = z.infer<typeof ParcelDataESchema>;
