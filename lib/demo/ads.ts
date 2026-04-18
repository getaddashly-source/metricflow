type DemoInsightRow = {
  campaign_id: string;
  campaign_name: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversion_value: number;
  date_start: string;
};

type CampaignSeed = {
  id: string;
  name: string;
  impressions: number;
  ctr: number;
  spend: number;
  conversionRate: number;
  valuePerConversion: number;
};

const META_CAMPAIGNS: CampaignSeed[] = [
  {
    id: "meta_demo_1",
    name: "Meta Prospecting - Advantage+",
    impressions: 15000,
    ctr: 1.9,
    spend: 100000,
    conversionRate: 0.03,
    valuePerConversion: 12000,
  },
  {
    id: "meta_demo_2",
    name: "Meta Retargeting - 14 Day Viewers",
    impressions: 6500,
    ctr: 3.4,
    spend: 85000,
    conversionRate: 0.06,
    valuePerConversion: 18000,
  },
  {
    id: "meta_demo_3",
    name: "Meta Lead Gen - Instant Form",
    impressions: 12000,
    ctr: 1.4,
    spend: 60000,
    conversionRate: 0.025,
    valuePerConversion: 8000,
  },
];

const GOOGLE_CAMPAIGNS: CampaignSeed[] = [
  {
    id: "google_demo_1",
    name: "Search - Brand Terms",
    impressions: 9000,
    ctr: 5.5,
    spend: 125000,
    conversionRate: 0.05,
    valuePerConversion: 20000,
  },
  {
    id: "google_demo_2",
    name: "Performance Max - Ecommerce",
    impressions: 17000,
    ctr: 2.1,
    spend: 140000,
    conversionRate: 0.04,
    valuePerConversion: 18500,
  },
  {
    id: "google_demo_3",
    name: "Display - Remarketing",
    impressions: 30000,
    ctr: 0.8,
    spend: 75000,
    conversionRate: 0.015,
    valuePerConversion: 9500,
  },
];

function toDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function dayFactor(day: number): number {
  const trend = 1 + day * 0.004;
  const seasonal = 1 + Math.sin(day / 3) * 0.08;
  return trend * seasonal;
}

function buildRows(campaigns: CampaignSeed[], days: number): DemoInsightRow[] {
  const rows: DemoInsightRow[] = [];

  for (const campaign of campaigns) {
    for (let day = days - 1; day >= 0; day--) {
      const factor = dayFactor(days - day);
      const impressions = Math.max(100, Math.round(campaign.impressions * factor));
      const clicks = Math.max(1, Math.round(impressions * (campaign.ctr / 100)));
      const spend = Math.round(campaign.spend * factor * 100) / 100;
      const conversions = Math.max(0, Math.round(clicks * campaign.conversionRate));
      const conversionValue =
        Math.round(conversions * campaign.valuePerConversion * factor * 100) / 100;

      rows.push({
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        impressions,
        clicks,
        spend,
        conversions,
        conversion_value: conversionValue,
        date_start: toDate(day),
      });
    }
  }

  return rows;
}

export function getMetaDemoInsights(days = 30): DemoInsightRow[] {
  return buildRows(META_CAMPAIGNS, days);
}

export function getGoogleDemoInsights(days = 30): DemoInsightRow[] {
  return buildRows(GOOGLE_CAMPAIGNS, days);
}
