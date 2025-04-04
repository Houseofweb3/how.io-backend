import { GraphQLClient, gql } from 'graphql-request';

// Extended interface to include monthly data for EQS model
interface ProjectRevenue {
    symbol: string;
    name: string;
    category: string;
    revenue: {
        daily: number;
        monthly: number;
        annualized: number;
    };
    // Added for EQS model - monthly revenue for past 13+ months
    monthlyData: {
        month: string; // YYYY-MM format
        revenue: number;
    }[];
}

interface AlgebraDayData {
    date: number; // Unix timestamp
    feesUSD: string;
}

const ALGEBRA_DAY_DATA_QUERY = gql`
  query GetAlgebraDayData($skip: Int!, $first: Int!) {
    algebraDayDatas(orderBy: date, orderDirection: desc, skip: $skip, first: $first) {
      date
      feesUSD
    }
  }
`;

export async function fetchAlgebraRevenue(
    subgraphUrl: string,
    apiKey: string
): Promise<ProjectRevenue> {
    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    const PAGE_SIZE = 100;
    let allData: AlgebraDayData[] = [];
    let hasMore = true;
    let skip = 0;

    // Fetch at least 400 days to ensure we have 13+ months
    while (hasMore && allData.length < 400) {
        const response = await client.request<{ algebraDayDatas: AlgebraDayData[] }>(ALGEBRA_DAY_DATA_QUERY, {
            skip,
            first: PAGE_SIZE,
        });

        const data = response.algebraDayDatas || [];
        allData = [...allData, ...data];
        skip += data.length;
        if (data.length < PAGE_SIZE) hasMore = false;
    }

    // Ensure max 400 entries and filter out zeros
    const dayData = allData.slice(0, 400).filter(d => parseFloat(d.feesUSD) > 0);

    // Calculate daily, monthly, and annualized metrics
    const daily = parseFloat(dayData[0]?.feesUSD || '0');
    const monthly = dayData.slice(0, 30).reduce((sum, d) => sum + parseFloat(d.feesUSD), 0);
    const annualized = dayData.slice(0, 365).reduce((sum, d) => sum + parseFloat(d.feesUSD), 0);

    // Group data by month for EQS model
    const monthlyData = groupDayDataByMonth(dayData);

    console.log(`\n📊 Fetched ${dayData.length} days of AlgebraDayData`);
    console.log(`Daily: $${daily.toFixed(2)}, Monthly: $${monthly.toFixed(2)}, Annualized: $${annualized.toFixed(2)}`);
    console.log(`Monthly data spans ${monthlyData.length} months`);

    return {
        symbol: "ALG",
        name: "Algebra DEX",
        category: "DEX",
        revenue: {
            daily: Math.round(daily * 100) / 100,
            monthly: Math.round(monthly * 100) / 100,
            annualized: Math.round(annualized * 100) / 100,
        },
        monthlyData,
    };
}

// Helper function to group daily data into monthly buckets
function groupDayDataByMonth(dayData: AlgebraDayData[]): { month: string; revenue: number }[] {
    const monthlyRevenue: Record<string, number> = {};

    dayData.forEach(day => {
        // Convert Unix timestamp to date
        const date = new Date(day.date * 1000);
        const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        // Add to monthly bucket
        if (!monthlyRevenue[month]) {
            monthlyRevenue[month] = 0;
        }
        monthlyRevenue[month] += parseFloat(day.feesUSD);
    });

    // Convert to array and sort by month (descending)
    return Object.entries(monthlyRevenue)
        .map(([month, revenue]) => ({
            month,
            revenue: Math.round(revenue * 100) / 100, // Round to 2 decimal places
        }))
        .sort((a, b) => b.month.localeCompare(a.month));
}

// Modified main function to aggregate multi-chain data with monthly breakdown
export async function fetchAlgebraProtocolRevenue(
    subgraphs: Record<string, string>,
    apiKey: string,
    symbol: string,
    name: string,
    category: string
): Promise<ProjectRevenue> {
    try {
        // Collect all version revenues
        const revenues: ProjectRevenue[] = [];

        for (const [version, url] of Object.entries(subgraphs)) {
            try {
                console.log(`Fetching ${version}...`);
                const revenue = await fetchAlgebraRevenue(url, apiKey);
                revenues.push(revenue);
                console.log(`${version} revenue:`, revenue.revenue);
            } catch (error: any) {
                console.error(`Error fetching ${version}:`, error.message);
            }
        }

        if (revenues.length === 0) {
            throw new Error("Failed to fetch any revenue data");
        }

        // Sum up all revenues
        const totalRevenue: ProjectRevenue = {
            symbol,
            name,
            category,
            revenue: {
                daily: 0,
                monthly: 0,
                annualized: 0
            },
            monthlyData: []
        };

        // Sum standard metrics
        revenues.forEach(rev => {
            totalRevenue.revenue.daily += rev.revenue.daily;
            totalRevenue.revenue.monthly += rev.revenue.monthly;
            totalRevenue.revenue.annualized += rev.revenue.annualized;
        });

        // Aggregate monthly data across all chains
        const monthlyMap: Record<string, number> = {};

        revenues.forEach(rev => {
            rev.monthlyData.forEach(monthData => {
                if (!monthlyMap[monthData.month]) {
                    monthlyMap[monthData.month] = 0;
                }
                monthlyMap[monthData.month] += monthData.revenue;
            });
        });

        // Convert aggregated monthly data to array and sort
        totalRevenue.monthlyData = Object.entries(monthlyMap)
            .map(([month, revenue]) => ({
                month,
                revenue: Math.round(revenue * 100) / 100
            }))
            .sort((a, b) => b.month.localeCompare(a.month));

        // Round to 2 decimal places
        totalRevenue.revenue.daily = Math.round(totalRevenue.revenue.daily * 100) / 100;
        totalRevenue.revenue.monthly = Math.round(totalRevenue.revenue.monthly * 100) / 100;
        totalRevenue.revenue.annualized = Math.round(totalRevenue.revenue.annualized * 100) / 100;

        console.log(`\nTotal ${name} Revenue:`, totalRevenue.revenue);
        console.log(`Monthly data spans ${totalRevenue.monthlyData.length} months`);

        return totalRevenue;
    } catch (error) {
        console.error(`Error in fetchAlgebraProtocolRevenue:`, error);
        throw error;
    }
}