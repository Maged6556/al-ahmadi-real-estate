export type PropertyTypeKey =
  | "apartment"
  | "building"
  | "residential_unit"
  | "villa"
  | "land";

export interface PropertyTypeOption {
  value: string;
  label: { ar: string; en: string };
}

export interface PropertyTypeField {
  key: string;
  label: { ar: string; en: string };
  inputType: "number" | "select" | "checkbox";
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: PropertyTypeOption[];
}

export interface PropertyTypeConfig {
  key: PropertyTypeKey;
  label: { ar: string; en: string };
  fields: PropertyTypeField[];
}

const yesNoOptions: PropertyTypeOption[] = [
  { value: "yes", label: { ar: "نعم", en: "Yes" } },
  { value: "no", label: { ar: "لا", en: "No" } },
];

const finishingTypeOptions: PropertyTypeOption[] = [
  { value: "full", label: { ar: "تشطيب كامل", en: "Full Finishing" } },
  { value: "semi", label: { ar: "نصف تشطيب", en: "Semi Finishing" } },
  { value: "raw", label: { ar: "على الطوب", en: "Blockwork (Rough)" } },
];

// Base fields shared by every property type. Rendered regardless of type and
// mapped to dedicated database columns.
export const BASE_FIELDS: string[] = [
  "code",
  "type",
  "offer",
  "city",
  "district",
  "addressText",
  "latitude",
  "longitude",
  "areaSqm",
  "bedrooms",
  "bathrooms",
  "floor",
  "features",
  "titleAr",
  "titleEn",
  "descriptionAr",
  "descriptionEn",
];

// Base fields whose visibility depends on the selected property type.
export const TYPE_GATED_BASE_FIELDS: Record<
  PropertyTypeKey,
  string[]
> = {
  apartment: ["areaSqm", "bedrooms", "bathrooms", "floor"],
  residential_unit: ["areaSqm", "bedrooms", "bathrooms", "floor"],
  villa: ["areaSqm", "bedrooms", "bathrooms", "floor"],
  building: ["areaSqm", "floor"],
  land: ["areaSqm"],
};

export const propertyTypeConfig: Record<PropertyTypeKey, PropertyTypeConfig> =
  {
    apartment: {
      key: "apartment",
      label: { ar: "شقة", en: "Apartment" },
      fields: [
        {
          key: "floorNumber",
          label: { ar: "رقم الطابق", en: "Floor Number" },
          inputType: "number",
          min: 0,
        },
        {
          key: "totalFloors",
          label: { ar: "إجمالي الطوابق في المبنى", en: "Total Floors in Building" },
          inputType: "number",
          min: 0,
        },
        {
          key: "finishingType",
          label: { ar: "نوع التشطيب", en: "Finishing Type" },
          inputType: "select",
          options: finishingTypeOptions,
        },
        {
          key: "elevator",
          label: { ar: "مصعد", en: "Elevator" },
          inputType: "select",
          options: yesNoOptions,
        },
        {
          key: "utilities",
          label: { ar: "المرافق / العدادات", en: "Utilities / Meters" },
          inputType: "checkbox",
          options: [
            { value: "electricity", label: { ar: "كهرباء", en: "Electricity" } },
            { value: "water", label: { ar: "مياه", en: "Water" } },
            { value: "gas", label: { ar: "غاز", en: "Gas" } },
          ],
        },
      ],
    },
    residential_unit: {
      key: "residential_unit",
      label: { ar: "وحدة سكنية", en: "Residential Unit" },
      fields: [
        {
          key: "unitSubType",
          label: { ar: "نوع الوحدة", en: "Unit Sub-type" },
          inputType: "select",
          options: [
            { value: "duplex", label: { ar: "دوبلكس", en: "Duplex" } },
            { value: "roof", label: { ar: "روف", en: "Roof" } },
            { value: "studio", label: { ar: "ستوديو", en: "Studio" } },
            {
              value: "ground_garden",
              label: { ar: "أرضي بحديقة", en: "Ground with Garden" },
            },
          ],
        },
        {
          key: "gardenRoofArea",
          label: { ar: "مساحة الحديقة / السطح (م²)", en: "Garden / Roof Area (m²)" },
          inputType: "number",
          min: 0,
          unit: "m²",
        },
        {
          key: "finishingType",
          label: { ar: "نوع التشطيب", en: "Finishing Type" },
          inputType: "select",
          options: finishingTypeOptions,
        },
        {
          key: "privateEntrance",
          label: { ar: "مدخل خاص", en: "Private Entrance" },
          inputType: "select",
          options: yesNoOptions,
        },
      ],
    },
    villa: {
      key: "villa",
      label: { ar: "فيلا", en: "Villa" },
      fields: [
        {
          key: "landArea",
          label: { ar: "مساحة الأرض (م²)", en: "Land Area (m²)" },
          inputType: "number",
          min: 0,
          unit: "m²",
        },
        {
          key: "gardenArea",
          label: { ar: "مساحة الحديقة (م²)", en: "Garden Area (m²)" },
          inputType: "number",
          min: 0,
          unit: "m²",
        },
        {
          key: "swimmingPool",
          label: { ar: "حوض سباحة", en: "Swimming Pool" },
          inputType: "select",
          options: yesNoOptions,
        },
        {
          key: "garage",
          label: { ar: "مرآب / مواقف", en: "Garage / Parking" },
          inputType: "select",
          options: yesNoOptions,
        },
        {
          key: "finishingType",
          label: { ar: "نوع التشطيب", en: "Finishing Type" },
          inputType: "select",
          options: finishingTypeOptions,
        },
      ],
    },
    building: {
      key: "building",
      label: { ar: "مبنى", en: "Building / Tower" },
      fields: [
        {
          key: "totalLandArea",
          label: { ar: "إجمالي مساحة الأرض (م²)", en: "Total Land Area (m²)" },
          inputType: "number",
          min: 0,
          unit: "m²",
        },
        {
          key: "builtUpAreaPerFloor",
          label: {
            ar: "المساحة المبنية لكل طابق (م²)",
            en: "Built-up Area per Floor (m²)",
          },
          inputType: "number",
          min: 0,
          unit: "m²",
        },
        {
          key: "totalUnits",
          label: { ar: "إجمالي الوحدات / الشقق", en: "Total Units / Apartments" },
          inputType: "number",
          min: 0,
        },
        {
          key: "commercialShops",
          label: { ar: "عدد المحلات التجارية", en: "Commercial Shops" },
          inputType: "number",
          min: 0,
        },
        {
          key: "elevator",
          label: { ar: "مصعد", en: "Elevator" },
          inputType: "select",
          options: yesNoOptions,
        },
        {
          key: "buildingStatus",
          label: { ar: "حالة الترخيص", en: "Building Status / License" },
          inputType: "select",
          options: [
            { value: "licensed", label: { ar: "مرخص", en: "Licensed" } },
            {
              value: "under_construction",
              label: { ar: "تحت الإنشاء", en: "Under Construction" },
            },
            { value: "ready", label: { ar: "جاهز", en: "Ready" } },
          ],
        },
        {
          key: "incomeYield",
          label: { ar: "العائد الإيجاري (اختياري)", en: "Income / Yield (optional)" },
          inputType: "number",
          min: 0,
        },
      ],
    },
    land: {
      key: "land",
      label: { ar: "أرض", en: "Land" },
      fields: [
        {
          key: "landClassification",
          label: { ar: "تصنيف الأرض", en: "Land Classification" },
          inputType: "select",
          options: [
            { value: "residential", label: { ar: "سكنية", en: "Residential" } },
            { value: "commercial", label: { ar: "تجارية", en: "Commercial" } },
            { value: "agricultural", label: { ar: "زراعية", en: "Agricultural" } },
            { value: "industrial", label: { ar: "صناعية", en: "Industrial" } },
          ],
        },
        {
          key: "streetWidth",
          label: { ar: "عرض الشارع (م)", en: "Street Width (m)" },
          inputType: "number",
          min: 0,
          unit: "m",
        },
        {
          key: "facadeLength",
          label: { ar: "طول الواجهة (م)", en: "Facade / Frontage Length (m)" },
          inputType: "number",
          min: 0,
          unit: "m",
        },
        {
          key: "buildingLicense",
          label: {
            ar: "ترخيص البناء متوفر",
            en: "Building License / Permits Available",
          },
          inputType: "select",
          options: yesNoOptions,
        },
        {
          key: "utilities",
          label: { ar: "المرافق في الموقع", en: "Utilities at Site" },
          inputType: "checkbox",
          options: [
            { value: "water", label: { ar: "مياه", en: "Water" } },
            { value: "electricity", label: { ar: "كهرباء", en: "Electricity" } },
            { value: "sewage", label: { ar: "صرف", en: "Sewage" } },
          ],
        },
      ],
    },
  };

export function getPropertyTypeConfig(
  key: PropertyTypeKey,
): PropertyTypeConfig {
  return propertyTypeConfig[key];
}

// Detail keys the server accepts for each type. Used to strip unknown keys.
export const DETAIL_KEYS_BY_TYPE: Record<PropertyTypeKey, string[]> = {
  apartment: [
    "floorNumber",
    "totalFloors",
    "finishingType",
    "elevator",
    "utilities",
  ],
  residential_unit: ["unitSubType", "gardenRoofArea", "finishingType", "privateEntrance"],
  villa: ["landArea", "gardenArea", "swimmingPool", "garage", "finishingType"],
  building: [
    "totalLandArea",
    "builtUpAreaPerFloor",
    "totalUnits",
    "commercialShops",
    "elevator",
    "buildingStatus",
    "incomeYield",
  ],
  land: [
    "landClassification",
    "streetWidth",
    "facadeLength",
    "buildingLicense",
    "utilities",
  ],
};
