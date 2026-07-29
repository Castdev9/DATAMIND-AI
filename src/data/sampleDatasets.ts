import { Dataset, ColumnMeta } from '../types';

function computeColumnStats(data: Record<string, any>[], colName: string): ColumnMeta {
  const sampleValues = data.slice(0, 5).map(r => r[colName]);
  let nullCount = 0;
  const uniqueVals = new Set();
  const numValues: number[] = [];

  let isNumeric = true;
  for (const row of data) {
    const val = row[colName];
    if (val === null || val === undefined || val === '') {
      nullCount++;
    } else {
      uniqueVals.add(val);
      if (typeof val === 'number') {
        numValues.push(val);
      } else if (!isNaN(Number(val)) && typeof val !== 'boolean') {
        numValues.push(Number(val));
      } else {
        isNumeric = false;
      }
    }
  }

  const type = isNumeric && numValues.length > 0 ? 'number' : 'string';

  let min: number | undefined;
  let max: number | undefined;
  let mean: number | undefined;
  let median: number | undefined;
  let stdDev: number | undefined;

  if (type === 'number' && numValues.length > 0) {
    numValues.sort((a, b) => a - b);
    min = numValues[0];
    max = numValues[numValues.length - 1];
    const sum = numValues.reduce((acc, curr) => acc + curr, 0);
    mean = Number((sum / numValues.length).toFixed(2));
    median = numValues[Math.floor(numValues.length / 2)];
    
    const variance = numValues.reduce((acc, curr) => acc + Math.pow(curr - mean!, 2), 0) / numValues.length;
    stdDev = Number(Math.sqrt(variance).toFixed(2));
  }

  return {
    name: colName,
    type: colName.toLowerCase().includes('date') || colName.toLowerCase().includes('month') ? 'date' : type,
    nullCount,
    uniqueCount: uniqueVals.size,
    min,
    max,
    mean,
    median,
    stdDev,
    sampleValues
  };
}

export function buildDataset(
  id: string,
  name: string,
  description: string,
  sourceType: Dataset['sourceType'],
  data: Record<string, any>[]
): Dataset {
  const columnNames = Object.keys(data[0] || {});
  const columns = columnNames.map(col => computeColumnStats(data, col));

  // Compute quality score based on null percentage and consistency
  const totalCells = data.length * columnNames.length;
  const totalNulls = columns.reduce((sum, c) => sum + c.nullCount, 0);
  const nullPercent = totalCells > 0 ? (totalNulls / totalCells) * 100 : 0;
  const dataQualityScore = Math.max(0, Math.min(100, Math.round(98 - nullPercent * 2)));

  return {
    id,
    name,
    description,
    rowCount: data.length,
    columnCount: columnNames.length,
    columns,
    data,
    dataQualityScore,
    createdAt: new Date().toISOString().split('T')[0],
    sourceType
  };
}

// 1. E-Commerce Sales & Churn Dataset
const ecommerceData: Record<string, any>[] = Array.from({ length: 80 }).map((_, i) => {
  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America'];
  const categories = ['Electronics', 'Home Appliances', 'Apparel', 'Books & Media'];
  const dates = ['2025-01-05', '2025-01-12', '2025-01-20', '2025-02-02', '2025-02-15', '2025-03-01', '2025-03-18', '2025-04-05', '2025-04-22', '2025-05-10'];
  
  const region = regions[i % regions.length];
  const category = categories[i % categories.length];
  const date = dates[i % dates.length];
  
  const sales = Math.round(150 + Math.random() * 850 + (i * 3));
  const discount = Math.round(5 + Math.random() * 25);
  const profit = Math.round(sales * (0.15 + (Math.random() * 0.25) - (discount * 0.005)));
  const satisfactionScore = Number((2.5 + Math.random() * 2.5).toFixed(1));
  const churnStatus = satisfactionScore < 3.2 || discount > 20 ? 'Churned' : 'Retained';
  const customerAge = 22 + Math.floor(Math.random() * 45);

  return {
    CustomerID: `CUST-${1000 + i}`,
    Date: date,
    Region: region,
    Category: category,
    Sales: sales,
    DiscountPct: discount,
    Profit: profit,
    CustomerAge: customerAge,
    SatisfactionScore: satisfactionScore,
    ChurnStatus: churnStatus
  };
});

// 2. SaaS Growth & Financial KPIs
const saasData: Record<string, any>[] = Array.from({ length: 36 }).map((_, i) => {
  const year = 2023 + Math.floor(i / 12);
  const monthNum = (i % 12) + 1;
  const monthStr = `${year}-${monthNum < 10 ? '0' + monthNum : monthNum}`;
  
  const baseMRR = 45000 + i * 3200 + Math.round((Math.random() - 0.5) * 4000);
  const churnRate = Number((4.5 - i * 0.08 + (Math.random() * 0.8)).toFixed(2));
  const cac = Math.round(420 + Math.random() * 120 - i * 3);
  const ltv = Math.round(3800 + i * 180 + Math.random() * 500);
  const activeUsers = Math.round(1200 + i * 280 + Math.random() * 200);
  const nps = Math.round(38 + i * 0.8 + Math.random() * 10);
  const supportTickets = Math.round(140 + Math.random() * 60);

  return {
    Month: monthStr,
    MRR: baseMRR,
    ChurnRatePct: Math.max(1.2, churnRate),
    CAC: cac,
    LTV: ltv,
    ActiveUsers: activeUsers,
    NPS: Math.min(85, nps),
    SupportTickets: supportTickets,
    LTV_CAC_Ratio: Number((ltv / cac).toFixed(2))
  };
});

// 3. Healthcare Patient Outcomes & Hospital Risk
const healthcareData: Record<string, any>[] = Array.from({ length: 60 }).map((_, i) => {
  const age = 25 + Math.floor(Math.random() * 55);
  const bmi = Number((20 + Math.random() * 16).toFixed(1));
  const bloodPressure = Math.round(110 + Math.random() * 40 + age * 0.2);
  const hospitalDays = Math.round(1 + Math.random() * 12 + (bmi > 30 ? 3 : 0));
  const treatmentCost = Math.round(hospitalDays * 1200 + Math.random() * 3000);
  const readmitted = (age > 60 || bmi > 32 || hospitalDays > 8) ? 'Yes' : 'No';
  const satisfaction = Number((3.0 + Math.random() * 2.0).toFixed(1));

  return {
    PatientID: `PAT-${300 + i}`,
    Age: age,
    Gender: i % 2 === 0 ? 'Female' : 'Male',
    BMI: bmi,
    BloodPressure: bloodPressure,
    HospitalDays: hospitalDays,
    TreatmentCost: treatmentCost,
    Readmitted: readmitted,
    PatientSatisfaction: satisfaction
  };
});

export const INITIAL_DATASETS: Dataset[] = [
  buildDataset(
    'ds-ecommerce',
    'Global E-Commerce Sales & Customer Churn',
    'Retail transactional dataset tracking regional sales performance, order discounts, profit margins, and customer retention metrics.',
    'sample',
    ecommerceData
  ),
  buildDataset(
    'ds-saas',
    'SaaS Subscription Growth & Financial KPIs',
    '3-Year longitudinal monthly telemetry tracking MRR trajectory, CAC/LTV efficiency ratios, user growth, and Net Promoter Score.',
    'sample',
    saasData
  ),
  buildDataset(
    'ds-healthcare',
    'Healthcare Patient Outcomes & Readmission Risk',
    'Clinical sample analyzing length of stay, medical expenditures, BMI markers, and 30-day hospital readmission risks.',
    'sample',
    healthcareData
  )
];
