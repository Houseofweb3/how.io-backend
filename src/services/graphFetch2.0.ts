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

interface DayData {
    date: number;
    feesUSD: string;
}

const UNISWAP_DAY_DATA_QUERY = gql`
  query GetUniswapDayData($first: Int!, $skip: Int!) {
    uniswapDayDatas(first: $first, skip: $skip, orderBy: date, orderDirection: desc) {
      date
      feesUSD
    }
  }
`;

export async function fetchUniswapRevenueFromDayData(subgraphUrl: string, apiKey: string): Promise<ProjectRevenue> {
    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    const PAGE_SIZE = 100;
    let allData: DayData[] = [];
    let hasMore = true;
    let skip = 0;

    while (hasMore && allData.length < 365) {
        const response = await client.request<{ uniswapDayDatas: DayData[] }>(UNISWAP_DAY_DATA_QUERY, {
            first: PAGE_SIZE,
            skip,
        });

        const data = response.uniswapDayDatas || [];
        allData = [...allData, ...data];
        skip += data.length;
        if (data.length < PAGE_SIZE) hasMore = false;
    }

    // Ensure max 365 entries
    const dayData = allData.slice(0, 365).filter(d => parseFloat(d.feesUSD) > 0);
    const daily = parseFloat(dayData[0]?.feesUSD || '0');
    const monthly = dayData.slice(0, 30).reduce((sum, d) => sum + parseFloat(d.feesUSD), 0);
    const annualized = dayData.reduce((sum, d) => sum + parseFloat(d.feesUSD), 0);

    console.log(`\n📊 Fetched ${dayData.length} days of UniswapDayData`);
    console.log(`Daily: $${daily.toFixed(2)}, Monthly: $${monthly.toFixed(2)}, Annualized: $${annualized.toFixed(2)}`);

    return {
        symbol: "UNI",
        name: "Uniswap",
        category: "DEX",
        revenue: {
            daily: Math.round(daily * 100) / 100,
            monthly: Math.round(monthly * 100) / 100,
            annualized: Math.round(annualized * 100) / 100,
        },
    };
}
