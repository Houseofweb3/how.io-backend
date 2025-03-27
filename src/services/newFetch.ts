import { GraphQLClient, gql } from 'graphql-request';

// Pagination parameters included in the query
const AAVE_REVENUE_QUERY = gql`
  query GetDailyRevenue($start: Int!, $end: Int!, $skip: Int!, $first: Int!) {
    financialsDailySnapshots(
      where: { timestamp_gte: $start, timestamp_lt: $end }
      orderBy: timestamp
      orderDirection: asc
      skip: $skip
      first: $first
    ) {
      timestamp
      dailyProtocolSideRevenueUSD
      dailySupplySideRevenueUSD
      dailyTotalRevenueUSD
    }
  }
`;

interface ProjectRevenue {
    symbol: string;
    name: string;
    category: string;
    revenue: {
        daily: number;
        monthly: number;
        annualized: number;
    };
}

interface DailySnapshot {
    timestamp: number;
    dailyProtocolSideRevenueUSD: string;
    dailySupplySideRevenueUSD: string;
    dailyTotalRevenueUSD: string;
}

export async function fetchAaveRevenue(subgraphUrl: string, apiKey: string): Promise<ProjectRevenue> {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 86400 * 365;

    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    let allSnapshots: DailySnapshot[] = [];
    let hasMore = true;
    let skip = 0;
    const PAGE_SIZE = 100; // TheGraph typically limits to 100 entities per query

    // Fetch all snapshots using pagination
    try {
        while (hasMore) {
            console.log(`Fetching snapshots: skip=${skip}, pageSize=${PAGE_SIZE}`);

            const { financialsDailySnapshots } = await client.request<{
                financialsDailySnapshots: DailySnapshot[];
            }>(AAVE_REVENUE_QUERY, {
                start: oneYearAgo,
                end: now,
                skip: skip,
                first: PAGE_SIZE
            });

            console.log(`Received ${financialsDailySnapshots.length} snapshots`);

            if (!financialsDailySnapshots || financialsDailySnapshots.length === 0) {
                hasMore = false;
            } else {
                allSnapshots = [...allSnapshots, ...financialsDailySnapshots];
                skip += financialsDailySnapshots.length;

                // If we got fewer results than the page size, we've reached the end
                if (financialsDailySnapshots.length < PAGE_SIZE) {
                    hasMore = false;
                }
            }
        }
    } catch (error: any) {
        console.error("Error fetching data from TheGraph:", error);
        throw new Error(`Failed to fetch data: ${error.message}`);
    }

    if (allSnapshots.length === 0) {
        throw new Error("No data returned from subgraph");
    }

    console.log(`Successfully fetched ${allSnapshots.length} daily snapshots`);

    // Process and convert string values to numbers
    // Also filter out any anomalous values
    const processedData = [];

    for (let i = 0; i < allSnapshots.length; i++) {
        const snapshot = allSnapshots[i];
        const revenue = parseFloat(snapshot.dailyTotalRevenueUSD || '0');

        // Skip any exceptionally large values (likely errors in the data)
        // We expect daily revenues to be in the thousands or millions, not trillions
        if (revenue > 0 && revenue < 10000000) { // Cap at $10M per day to filter outliers
            processedData.push({
                timestamp: snapshot.timestamp,
                totalRevenue: revenue
            });
        } else if (revenue >= 10000000) {
            console.log(`Skipping anomalous value at index ${i}: ${revenue}`);
        }
    }

    // Sort by timestamp
    processedData.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`After filtering, using ${processedData.length} valid data points out of ${allSnapshots.length}`);

    // Get the latest day's revenue
    const latestDayRevenue = processedData[processedData.length - 1].totalRevenue;

    // Calculate monthly revenue (last 30 days)
    const last30Days = processedData.slice(-30);
    let monthlyRevenue = 0;

    // Log each daily value for the monthly calculation
    console.log("\nDaily values for monthly calculation:");
    for (let i = 0; i < last30Days.length; i++) {
        const dayRevenue = last30Days[i].totalRevenue;
        console.log(`Day ${i + 1}: ${dayRevenue}`);
        monthlyRevenue += dayRevenue;
    }

    // Calculate annual revenue (sum of all days)
    let annualRevenue = 0;

    // Find min and max daily revenue to spot outliers
    let minRevenue = Infinity;
    let maxRevenue = 0;

    for (const day of processedData) {
        annualRevenue += day.totalRevenue;
        minRevenue = Math.min(minRevenue, day.totalRevenue);
        maxRevenue = Math.max(maxRevenue, day.totalRevenue);
    }

    console.log(`\nRevenue range: Min=${minRevenue}, Max=${maxRevenue}`);
    console.log(`Latest day revenue: ${latestDayRevenue}`);
    console.log(`Monthly revenue (last ${last30Days.length} days): ${monthlyRevenue}`);
    console.log(`Annual revenue (${processedData.length} days): ${annualRevenue}`);

    // If we don't have a full year of data, annualize based on available data
    if (processedData.length < 365) {
        annualRevenue = (annualRevenue / processedData.length) * 365;
        console.log(`Annualized revenue (extrapolated): ${annualRevenue}`);
    }

    return {
        symbol: "AAVE",
        name: "Aave",
        category: "DeFi/Lending",
        revenue: {
            daily: Math.round(latestDayRevenue * 100) / 100,
            monthly: Math.round(monthlyRevenue * 100) / 100,
            annualized: Math.round(annualRevenue * 100) / 100
        }
    };
}

// Example usage
// fetchAaveRevenue('https://api.thegraph.com/subgraphs/name/aave/protocol-v2', 'YOUR_API_KEY')
//   .then(data => console.log(JSON.stringify(data, null, 2)))
//   .catch(error => console.error('Error fetching Aave revenue:', error));