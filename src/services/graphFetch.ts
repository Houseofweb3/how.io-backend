import { GraphQLClient, gql } from 'graphql-request';

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

interface FeeData {
    id: string;
    totalFeesUSD: string;
    totalVolumeUSD: string;
    txCount: string;
}

// Flexible query that tries multiple entity types that might contain fee data
const UNISWAP_REVENUE_QUERY = gql`
  query GetUniswapRevenue($first: Int!, $skip: Int!) {
    # Try poolManagers (v4)
    poolManagers(first: $first, skip: $skip) {
      id
      totalFeesUSD
      totalVolumeUSD
      txCount
    }
    # Try factories (v3)
    factories(first: $first, skip: $skip) {
      id
      totalFeesUSD
      totalVolumeUSD
      txCount
    }
    # Try protocol (some subgraphs)
    protocols(first: $first, skip: $skip) {
      id
      totalFeesUSD
      totalVolumeUSD
      txCount
    }
  }
`;

export async function fetchUniswapRevenue(subgraphUrl: string, apiKey: string): Promise<ProjectRevenue> {
    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    try {
        // Fetch the current cumulative data from any available entity
        const data = await fetchFlexibleData(client);

        if (!data || data.length === 0) {
            throw new Error("No revenue data found in any entity type");
        }

        // Get the entity with the highest fees
        const mainEntity = data.reduce((prev, current) => {
            const prevFees = parseFloat(prev.totalFeesUSD || '0');
            const currentFees = parseFloat(current.totalFeesUSD || '0');
            return prevFees > currentFees ? prev : current;
        });

        // Extract the total fees
        const totalFees = parseFloat(mainEntity.totalFeesUSD || '0');

        // Extract transaction count
        const txCount = parseInt(mainEntity.txCount || '0');
        const avgFeePerTx = txCount > 0 ? totalFees / txCount : 0;

        // Estimate daily transaction rate
        const estimatedDailyTx = txCount / 365; // Rough estimate

        // Calculate revenues based on estimated transaction rates
        const dailyRevenue = estimatedDailyTx * avgFeePerTx;
        const monthlyRevenue = dailyRevenue * 30;
        const annualRevenue = dailyRevenue * 365;

        console.log("\nRevenue Calculation (Based on cumulative data):");
        console.log(`Total Fees To Date: $${totalFees.toLocaleString()}`);
        console.log(`Total Transactions: ${txCount.toLocaleString()}`);
        console.log(`Average Fee Per Transaction: $${avgFeePerTx.toLocaleString()}`);
        console.log(`Estimated Daily Revenue: $${dailyRevenue.toLocaleString()}`);
        console.log(`Estimated Monthly Revenue: $${monthlyRevenue.toLocaleString()}`);
        console.log(`Estimated Annual Revenue: $${annualRevenue.toLocaleString()}`);

        return {
            symbol: "UNI",
            name: "Uniswap",
            category: "DEX",
            revenue: {
                daily: Math.round(dailyRevenue * 100) / 100,
                monthly: Math.round(monthlyRevenue * 100) / 100,
                annualized: Math.round(annualRevenue * 100) / 100
            }
        };

    } catch (error: any) {
        // Try fallback query if the flexible query fails
        if (error.message?.includes('has no field')) {
            return fetchWithFallbackQuery(subgraphUrl, apiKey);
        }

        console.error("Error fetching Uniswap revenue:", error);
        throw error;
    }
}

// Helper function to dynamically detect and fetch from available entities
async function fetchFlexibleData(client: GraphQLClient): Promise<FeeData[]> {
    let allEntities: FeeData[] = [];
    let skip = 0;
    const PAGE_SIZE = 100;

    const response = await client.request<{
        poolManagers?: FeeData[];
        factories?: FeeData[];
        protocols?: FeeData[];
    }>(UNISWAP_REVENUE_QUERY, {
        skip: skip,
        first: PAGE_SIZE
    });

    // Check which entities are available in the response
    const entities = [];
    if (response.poolManagers && response.poolManagers.length > 0) {
        entities.push(...response.poolManagers);
    }
    if (response.factories && response.factories.length > 0) {
        entities.push(...response.factories);
    }
    if (response.protocols && response.protocols.length > 0) {
        entities.push(...response.protocols);
    }

    allEntities = [...entities];

    // Filter valid entities
    return allEntities.filter(entity => {
        const fees = parseFloat(entity.totalFeesUSD || '0');
        return fees > 0 && fees < 10000000000; // Filter outliers
    });
}

// Fallback approach that detects schema at runtime
async function fetchWithFallbackQuery(subgraphUrl: string, apiKey: string): Promise<ProjectRevenue> {
    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    // Try to detect available entities in the schema
    const introspectionQuery = gql`
      {
        __schema {
          queryType {
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
      }
    `;

    try {
        const schemaInfo = await client.request<{
            __schema: {
                queryType: {
                    fields: { name: string; type: { name: string; kind: string } }[];
                };
            };
        }>(introspectionQuery);
        const queryFields = schemaInfo.__schema.queryType.fields.map(f => f.name);

        // Detect which entities we can query
        const entities = [];
        if (queryFields.includes('poolManagers')) entities.push('poolManagers');
        if (queryFields.includes('factories')) entities.push('factories');
        if (queryFields.includes('protocols')) entities.push('protocols');

        if (entities.length === 0) {
            throw new Error("Could not detect any supported entities in the schema");
        }

        // Build dynamic query based on available entities
        const dynamicQueryParts = entities.map(entity => `
          ${entity}(first: 100) {
            id
            totalFeesUSD
            totalVolumeUSD
            txCount
          }
        `);

        const dynamicQuery = gql`
          query {
            ${dynamicQueryParts.join('\n')}
          }
        `;

        const data = await client.request<Record<string, FeeData[]>>(dynamicQuery);

        // Process all available entities
        let allEntities: FeeData[] = [];
        entities.forEach(entity => {
            if (data && typeof data === 'object' && Array.isArray((data as Record<string, any>)[entity]) && (data as Record<string, any>)[entity].length > 0) {
                allEntities = [...allEntities, ...data[entity]];
            }
        });

        if (allEntities.length === 0) {
            throw new Error("No data found in any entity");
        }

        // Rest of processing similar to main function
        const mainEntity = allEntities.reduce((prev, current) => {
            const prevFees = parseFloat(prev.totalFeesUSD || '0');
            const currentFees = parseFloat(current.totalFeesUSD || '0');
            return prevFees > currentFees ? prev : current;
        });

        const totalFees = parseFloat(mainEntity.totalFeesUSD || '0');
        const txCount = parseInt(mainEntity.txCount || '0');
        const avgFeePerTx = txCount > 0 ? totalFees / txCount : 0;
        const estimatedDailyTx = txCount / 365;
        const dailyRevenue = estimatedDailyTx * avgFeePerTx;
        const monthlyRevenue = dailyRevenue * 30;
        const annualRevenue = dailyRevenue * 365;

        return {
            symbol: "UNI",
            name: "Uniswap",
            category: "DEX",
            revenue: {
                daily: Math.round(dailyRevenue * 100) / 100,
                monthly: Math.round(monthlyRevenue * 100) / 100,
                annualized: Math.round(annualRevenue * 100) / 100
            }
        };

    } catch (error: any) {
        console.error("Error with fallback query:", error);
        throw new Error(`Failed to fetch revenue data: ${error.message}`);
    }
}

// Example usage
// fetchUniswapRevenue('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', 'YOUR_API_KEY')
//   .then(data => console.log(JSON.stringify(data, null, 2)))
//   .catch(error => console.error('Error fetching Uniswap revenue:', error));