export interface Plan {
  id: string;
  plan_name: string;
  municipality: string;
  plan_type: string;
  year_adopted: number | null;
  adoption_status: string;
  pdf_filename: string;
  pdf_url: string | null;
  municipal_url: string | null;
  consultant: string | null;
  mapc_involvement: boolean;
  topics: string[];
  summary: string | null;
  section_count?: number;
  recommendation_count?: number;
}

export interface Section {
  id: string;
  plan_id: string;
  section_title: string;
  section_number: string | null;
  content: string;
  page_start: number;
  page_end: number;
  topics: string[];
  section_type: string;
  template_section: string | null;
  sort_order: number;
}

export interface Recommendation {
  id: string;
  plan_id: string;
  text: string;
  category: string;
  priority: string | null;
  timeframe: string | null;
  responsible_party: string | null;
  source_section_id: string;
  topics: string[];
  municipality?: string;
  plan_name?: string;
  // Source citation fields (joined from sections/plans)
  source_section_title?: string;
  source_page_start?: number;
  source_page_end?: number;
  pdf_url?: string;
}

export interface Municipality {
  id: string;
  name: string;
  mapc_subregion: string;
  population: number;
  area_sq_miles: number;
  latitude: number;
  longitude: number;
  plan_count?: number;
  has_plan?: boolean;
  // MMA Data Hub fields
  city_or_town?: string;
  population_density?: number;
  county?: string;
  form_of_government?: string;
  income_per_capita?: number;
  median_home_value?: number;
  median_gross_rent?: number;
  total_households?: number;
  average_household_size?: number;
  registered_voters?: number;
  owner_occupied_rate?: number;
  residential_tax_rate?: number;
  commercial_tax_rate?: number;
  average_tax_bill?: number;
  regional_planning_agency?: string;
}

export interface DataSource {
  id: string;
  plan_id: string;
  section_id: string | null;
  source_name: string;
  source_type: string | null;
  year: string | null;
  page_number: number | null;
  url: string | null;
}

export interface SearchResult {
  plan_id: string;
  plan_name: string;
  municipality: string;
  section_id: string;
  section_title: string;
  snippet: string;
  page_start: number;
  rank?: number;
}

export interface DashboardStats {
  total_plans: number;
  total_sections: number;
  total_recommendations: number;
  municipalities_with_plans: number;
  total_municipalities: number;
  plans_by_type: Record<string, number>;
  plans_by_year: Record<string, number>;
  plans_by_status: Record<string, number>;
  recommendations_by_category: Record<string, number>;
  top_topics: { topic: string; count: number }[];
}

// Topic taxonomy
export const TOPIC_FAMILIES: Record<string, { bg: string; text: string; label: string }> = {
  trails_and_greenways: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Trails & Greenways" },
  water_resources: { bg: "bg-tag-blue-bg", text: "text-tag-blue-text", label: "Water Resources" },
  wetlands: { bg: "bg-tag-blue-bg", text: "text-tag-blue-text", label: "Wetlands" },
  forests_and_wildlife: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Forests & Wildlife" },
  parks_and_playgrounds: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Parks & Playgrounds" },
  athletic_fields: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Athletic Fields" },
  conservation_land: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Conservation Land" },
  agricultural_land: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Agricultural Land" },
  scenic_resources: { bg: "bg-tag-green-bg", text: "text-tag-green-text", label: "Scenic Resources" },
  historic_resources: { bg: "bg-tag-amber-bg", text: "text-tag-amber-text", label: "Historic Resources" },
  accessibility_and_ada: { bg: "bg-tag-purple-bg", text: "text-tag-purple-text", label: "Accessibility & ADA" },
  environmental_justice: { bg: "bg-tag-purple-bg", text: "text-tag-purple-text", label: "Environmental Justice" },
  climate_resilience: { bg: "bg-tag-blue-bg", text: "text-tag-blue-text", label: "Climate Resilience" },
  land_acquisition: { bg: "bg-tag-coral-bg", text: "text-tag-coral-text", label: "Land Acquisition" },
  stewardship_and_maintenance: { bg: "bg-tag-amber-bg", text: "text-tag-amber-text", label: "Stewardship & Maintenance" },
  funding_and_grants: { bg: "bg-tag-amber-bg", text: "text-tag-amber-text", label: "Funding & Grants" },
  partnerships: { bg: "bg-tag-amber-bg", text: "text-tag-amber-text", label: "Partnerships" },
  community_engagement: { bg: "bg-tag-purple-bg", text: "text-tag-purple-text", label: "Community Engagement" },
  regional_coordination: { bg: "bg-tag-amber-bg", text: "text-tag-amber-text", label: "Regional Coordination" },
  goals_and_objectives: { bg: "bg-tag-coral-bg", text: "text-tag-coral-text", label: "Goals & Objectives" },
};

export const PLAN_TYPES: Record<string, string> = {
  open_space_recreation: "Open Space & Recreation",
  housing_production: "Housing Production Plan",
  comprehensive_plan: "Comprehensive Plan",
  housing: "Housing Plan",
  transportation: "Transportation Plan",
  climate_adaptation: "Climate Adaptation",
  hazard_mitigation: "Hazard Mitigation",
  economic_development: "Economic Development",
};

// Consistent colors for plan type pills/tags — uses the existing tag color system from tailwind config
export const PLAN_TYPE_COLORS: Record<string, { pill: string; slug: string }> = {
  open_space_recreation: { pill: "bg-tag-green-bg text-tag-green-text", slug: "osrp" },
  housing_production: { pill: "bg-tag-blue-bg text-tag-blue-text", slug: "hpp" },
  digital_equity: { pill: "bg-tag-purple-bg text-tag-purple-text", slug: "dep" },
  comprehensive_plan: { pill: "bg-tag-amber-bg text-tag-amber-text", slug: "comprehensive" },
  housing: { pill: "bg-tag-blue-bg text-tag-blue-text", slug: "housing" },
  transportation: { pill: "bg-tag-coral-bg text-tag-coral-text", slug: "transportation" },
  climate_adaptation: { pill: "bg-tag-blue-bg text-tag-blue-text", slug: "climate" },
  hazard_mitigation: { pill: "bg-tag-coral-bg text-tag-coral-text", slug: "hazard" },
  economic_development: { pill: "bg-tag-amber-bg text-tag-amber-text", slug: "economic" },
};

export const RECOMMENDATION_CATEGORIES: Record<string, { color: string; label: string }> = {
  trails: { color: "bg-tag-green-bg text-tag-green-text", label: "Trails" },
  water_resources: { color: "bg-tag-blue-bg text-tag-blue-text", label: "Water Resources" },
  conservation: { color: "bg-tag-green-bg text-tag-green-text", label: "Conservation" },
  parks: { color: "bg-tag-green-bg text-tag-green-text", label: "Parks" },
  accessibility: { color: "bg-tag-purple-bg text-tag-purple-text", label: "Accessibility" },
  acquisition: { color: "bg-tag-coral-bg text-tag-coral-text", label: "Acquisition" },
  stewardship: { color: "bg-tag-amber-bg text-tag-amber-text", label: "Stewardship" },
  funding: { color: "bg-tag-amber-bg text-tag-amber-text", label: "Funding" },
  partnerships: { color: "bg-tag-amber-bg text-tag-amber-text", label: "Partnerships" },
  climate: { color: "bg-tag-blue-bg text-tag-blue-text", label: "Climate" },
  engagement: { color: "bg-tag-purple-bg text-tag-purple-text", label: "Engagement" },
  general: { color: "bg-gray-100 text-gray-700", label: "General" },
};
