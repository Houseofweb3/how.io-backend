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

interface AlgebraDayData {
    date: number;
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

export async function fetchAlgebraRevenue(subgraphUrl: string, apiKey: string): Promise<ProjectRevenue> {
    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    const PAGE_SIZE = 100;
    let allDayData: AlgebraDayData[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore && allDayData.length < 365) {
        const response = await client.request<{ algebraDayDatas: AlgebraDayData[] }>(ALGEBRA_DAY_DATA_QUERY, {
            skip,
            first: PAGE_SIZE,
        });

        const fetched = response.algebraDayDatas.filter(day => parseFloat(day.feesUSD) > 0);
        allDayData = [...allDayData, ...fetched];

        skip += PAGE_SIZE;
        hasMore = fetched.length === PAGE_SIZE;
    }

    const last365Days = allDayData.slice(0, 365);
    const totalFees = last365Days.reduce((sum, day) => sum + parseFloat(day.feesUSD), 0);
    const validDays = last365Days.length;

    const dailyRevenue = validDays > 0 ? totalFees / validDays : 0;
    const monthlyRevenue = dailyRevenue * 30;
    const annualRevenue = dailyRevenue * 365;

    console.log(`\n📊 Fetched ${validDays} Algebra day entries`);
    console.log(`Daily: $${dailyRevenue.toFixed(2)}, Monthly: $${monthlyRevenue.toFixed(2)}, Annualized: $${annualRevenue.toFixed(2)}`);

    return {
        symbol: "ALG",
        name: "Algebra DEX",
        category: "DEX",
        revenue: {
            daily: Math.round(dailyRevenue * 100) / 100,
            monthly: Math.round(monthlyRevenue * 100) / 100,
            annualized: Math.round(annualRevenue * 100) / 100,
        },
    };
}
