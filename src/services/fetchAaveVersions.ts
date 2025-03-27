import { GraphQLClient, gql } from 'graphql-request';

// Define all Aave deployments across versions and chains
const AAVE_DEPLOYMENTS = {
    // Aave V1 - First version, primarily on Ethereum
    v1: {
        ethereum: {
            name: "Aave V1 (Ethereum)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v1",
            active: false, // No longer actively used
            launchDate: "2020-01-08"
        }
    },

    // Aave V2 - Second major version with multiple deployments
    v2: {
        ethereum: {
            name: "Aave V2 (Ethereum)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v2",
            active: true,
            launchDate: "2020-12-03"
        },
        polygon: {
            name: "Aave V2 (Polygon)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/aave-v2-matic",
            active: true,
            launchDate: "2021-04-14"
        },
        avalanche: {
            name: "Aave V2 (Avalanche)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v2-avalanche",
            active: true,
            launchDate: "2021-10-04"
        }
    },

    // Aave V3 - Latest version with the broadest deployment
    v3: {
        ethereum: {
            name: "Aave V3 (Ethereum)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3",
            active: true,
            launchDate: "2023-01-27"
        },
        polygon: {
            name: "Aave V3 (Polygon)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon",
            active: true,
            launchDate: "2022-03-16"
        },
        avalanche: {
            name: "Aave V3 (Avalanche)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-avalanche",
            active: true,
            launchDate: "2022-03-16"
        },
        arbitrum: {
            name: "Aave V3 (Arbitrum)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-arbitrum",
            active: true,
            launchDate: "2022-03-16"
        },
        optimism: {
            name: "Aave V3 (Optimism)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-optimism",
            active: true,
            launchDate: "2022-03-16"
        },
        fantom: {
            name: "Aave V3 (Fantom)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-fantom",
            active: true,
            launchDate: "2022-03-16"
        },
        harmony: {
            name: "Aave V3 (Harmony)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-harmony",
            active: false, // Harmony bridge hack led to deprecation
            launchDate: "2022-03-16"
        },
        metis: {
            name: "Aave V3 (Metis)",
            subgraphUrl: "https://andromeda.thegraph.metis.io/subgraphs/name/aave/protocol-v3-metis",
            active: true,
            launchDate: "2022-06-22"
        },
        base: {
            name: "Aave V3 (Base)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-base",
            active: true,
            launchDate: "2023-07-14"
        },
        gnosis: {
            name: "Aave V3 (Gnosis)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-gnosis",
            active: true,
            launchDate: "2023-03-15"
        },
        bnb: {
            name: "Aave V3 (BNB Chain)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-bsc",
            active: true,
            launchDate: "2023-09-27"
        },
        scroll: {
            name: "Aave V3 (Scroll)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/protocol-v3-scroll",
            active: true,
            launchDate: "2023-10-18"
        }
    },

    // GHO - Aave's stablecoin
    gho: {
        ethereum: {
            name: "GHO (Ethereum)",
            subgraphUrl: "https://api.thegraph.com/subgraphs/name/aave/gho-ethereum",
            active: true,
            launchDate: "2023-05-17"
        }
    }
};

// Query to fetch revenue data with pagination
const REVENUE_QUERY = gql`
  query GetDailyRevenue($start: Int!, $end: Int!, $skip: Int!, $first: Int!) {
    financialsDailySnapshots(
      where: { timestamp_gte: $start, timestamp_lt: $end }
      orderBy: timestamp
      orderDirection: asc
      skip: $skip
      first: $first
    ) {
      timestamp
      dailyTotalRevenueUSD
      dailyProtocolSideRevenueUSD
      dailySupplySideRevenueUSD
    }
  }
`;

// Interfaces
interface DeploymentInfo {
    name: string;
    version: string;
    chain: string;
    subgraphUrl: string;
    active: boolean;
    launchDate: string;
}

interface DeploymentRevenue {
    name: string;
    version: string;
    chain: string;
    revenue: {
        daily: number;
        monthly: number;
        annualized: number;
        dataPoints: number;
        startDate: string;
        endDate: string;
    };
}

interface AggregateRevenue {
    total: {
        daily: number;
        monthly: number;
        annualized: number;
    };
    byVersion: {
        [version: string]: {
            daily: number;
            monthly: number;
            annualized: number;
        };
    };
    byChain: {
        [chain: string]: {
            daily: number;
            monthly: number;
            annualized: number;
        };
    };
    deployments: DeploymentRevenue[];
}

/**
 * Get all active Aave deployments
 */
function getActiveAaveDeployments(): DeploymentInfo[] {
    const activeDeployments = [];

    // Iterate through all versions and chains
    for (const [version, chains] of Object.entries(AAVE_DEPLOYMENTS)) {
        for (const [chain, deployment] of Object.entries(chains)) {
            if (deployment.active) {
                activeDeployments.push({
                    version,
                    chain,
                    name: deployment.name,
                    subgraphUrl: deployment.subgraphUrl,
                    active: deployment.active,
                    launchDate: deployment.launchDate
                });
            }
        }
    }

    return activeDeployments;
}

/**
 * Fetch revenue data for a specific Aave deployment
 */
async function fetchDeploymentRevenue(
    name: string,
    version: string,
    chain: string,
    subgraphUrl: string,
    apiKey: string
): Promise<DeploymentRevenue | null> {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 86400 * 365;

    const client = new GraphQLClient(subgraphUrl, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });

    let allSnapshots: { timestamp: number; dailyTotalRevenueUSD: string }[] = [];;
    let hasMore = true;
    let skip = 0;
    const PAGE_SIZE = 100;

    try {
        console.log(`Fetching data for ${name}...`);

        // Fetch all snapshots using pagination
        while (hasMore) {
            const { financialsDailySnapshots } = await client.request<{
                financialsDailySnapshots: { timestamp: number; dailyTotalRevenueUSD: string }[];
            }>({
                document: REVENUE_QUERY,
                variables: {
                    start: oneYearAgo,
                    end: now,
                    skip: skip,
                    first: PAGE_SIZE
                },
            });

            if (!financialsDailySnapshots || financialsDailySnapshots.length === 0) {
                hasMore = false;
            } else {
                allSnapshots = [...allSnapshots, ...financialsDailySnapshots];
                skip += financialsDailySnapshots.length;

                if (financialsDailySnapshots.length < PAGE_SIZE) {
                    hasMore = false;
                }
            }
        }

        console.log(`Retrieved ${allSnapshots.length} snapshots for ${name}`);

        if (allSnapshots.length === 0) {
            console.warn(`No data available for ${name}`);
            return null;
        }

        // Process the data - filter anomalous values
        const processedData = [];

        for (const snapshot of allSnapshots) {
            const revenue = parseFloat(snapshot.dailyTotalRevenueUSD || '0');

            // Skip outliers (adjust threshold as needed for different chains)
            if (revenue > 0 && revenue < 10000000) {
                processedData.push({
                    timestamp: snapshot.timestamp,
                    totalRevenue: revenue
                });
            } else if (revenue >= 10000000) {
                console.log(`Skipping anomalous value for ${name}: ${revenue}`);
            }
        }

        if (processedData.length === 0) {
            console.warn(`No valid data points for ${name} after filtering`);
            return null;
        }

        // Sort by timestamp
        processedData.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate revenue metrics
        const latestDayRevenue = processedData[processedData.length - 1].totalRevenue;

        // Monthly revenue (last 30 days or available data)
        const last30Days = processedData.slice(-Math.min(30, processedData.length));
        const monthlyRevenue = last30Days.reduce((sum, day) => sum + day.totalRevenue, 0);

        // Annual revenue
        const annualRevenue = processedData.reduce((sum, day) => sum + day.totalRevenue, 0);
        const annualizedRevenue = processedData.length < 365 ?
            (annualRevenue / processedData.length) * 365 :
            annualRevenue;

        // Calculate date range
        const startDate = new Date(processedData[0].timestamp * 1000).toISOString().split('T')[0];
        const endDate = new Date(processedData[processedData.length - 1].timestamp * 1000).toISOString().split('T')[0];

        return {
            name,
            version,
            chain,
            revenue: {
                daily: Math.round(latestDayRevenue * 100) / 100,
                monthly: Math.round(monthlyRevenue * 100) / 100,
                annualized: Math.round(annualizedRevenue * 100) / 100,
                dataPoints: processedData.length,
                startDate,
                endDate
            }
        };
    } catch (error) {
        console.error(`Error fetching data for ${name}:`, error);
        return null;
    }
}

/**
 * Aggregate revenue across all Aave deployments
 * @param apiKey Optional API key for TheGraph (if using authenticated endpoints)
 * @returns Aggregated revenue data for all Aave deployments
 */
export async function getAggregateAaveRevenue(apiKey: string = ''): Promise<AggregateRevenue> {
    console.log("Starting Aave revenue aggregation across all deployments...");

    const deployments = getActiveAaveDeployments();
    const results: DeploymentRevenue[] = [];

    // Fetch data for all deployments
    for (const deployment of deployments) {
        try {
            const result = await fetchDeploymentRevenue(
                deployment.name,
                deployment.version,
                deployment.chain,
                deployment.subgraphUrl,
                apiKey
            );

            if (result) {
                results.push(result);
            }
        } catch (error) {
            console.error(`Failed to fetch data for ${deployment.name}:`, error);
        }
    }

    // Initialize aggregation objects
    const byVersion: { [version: string]: { daily: number; monthly: number; annualized: number } } = {};
    const byChain: { [chain: string]: { daily: number; monthly: number; annualized: number } } = {};
    let totalDaily = 0;
    let totalMonthly = 0;
    let totalAnnualized = 0;

    console.log(`Successfully fetched data for ${results.length} out of ${deployments.length} Aave deployments`);

    // Aggregate results
    for (const result of results) {
        console.log(`Adding revenue from ${result.name}: $${result.revenue.annualized.toLocaleString()}`);

        // Add to total
        totalDaily += result.revenue.daily;
        totalMonthly += result.revenue.monthly;
        totalAnnualized += result.revenue.annualized;

        // Aggregate by version
        if (!byVersion[result.version]) {
            byVersion[result.version] = { daily: 0, monthly: 0, annualized: 0 };
        }
        byVersion[result.version].daily += result.revenue.daily;
        byVersion[result.version].monthly += result.revenue.monthly;
        byVersion[result.version].annualized += result.revenue.annualized;

        // Aggregate by chain
        if (!byChain[result.chain]) {
            byChain[result.chain] = { daily: 0, monthly: 0, annualized: 0 };
        }
        byChain[result.chain].daily += result.revenue.daily;
        byChain[result.chain].monthly += result.revenue.monthly;
        byChain[result.chain].annualized += result.revenue.annualized;
    }

    // Round totals to 2 decimal places
    totalDaily = Math.round(totalDaily * 100) / 100;
    totalMonthly = Math.round(totalMonthly * 100) / 100;
    totalAnnualized = Math.round(totalAnnualized * 100) / 100;

    // Round values in byVersion and byChain
    for (const version in byVersion) {
        byVersion[version].daily = Math.round(byVersion[version].daily * 100) / 100;
        byVersion[version].monthly = Math.round(byVersion[version].monthly * 100) / 100;
        byVersion[version].annualized = Math.round(byVersion[version].annualized * 100) / 100;
    }

    for (const chain in byChain) {
        byChain[chain].daily = Math.round(byChain[chain].daily * 100) / 100;
        byChain[chain].monthly = Math.round(byChain[chain].monthly * 100) / 100;
        byChain[chain].annualized = Math.round(byChain[chain].annualized * 100) / 100;
    }

    console.log(`Total Aave revenue across all deployments: ${totalAnnualized.toLocaleString()} annually`);

    const finalResult = {
        total: {
            daily: totalDaily,
            monthly: totalMonthly,
            annualized: totalAnnualized
        },
        byVersion,
        byChain,
        deployments: results
    };

    // Log version breakdown
    console.log("\nRevenue by Version:");
    for (const [version, data] of Object.entries(byVersion)) {
        console.log(`${version}: ${data.annualized.toLocaleString()} annually (${(data.annualized / totalAnnualized * 100).toFixed(1)}%)`);
    }

    // Log chain breakdown
    console.log("\nRevenue by Chain:");
    for (const [chain, data] of Object.entries(byChain)) {
        console.log(`${chain}: ${data.annualized.toLocaleString()} annually (${(data.annualized / totalAnnualized * 100).toFixed(1)}%)`);
    }

    return finalResult;
}

/**
 * Main function to run the revenue collection
 */
