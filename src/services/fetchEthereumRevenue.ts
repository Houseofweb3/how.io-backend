import { GraphQLClient, gql } from 'graphql-request';

const AAVE_REVENUE_QUERY = gql`
  query GetDailyRevenue($start: Int!, $end: Int!) {
    financialsDailySnapshots(
      where: { timestamp_gte: $start, timestamp_lt: $end }
      orderBy: timestamp
      orderDirection: asc
    ) {
      timestamp
      dailyProtocolSideRevenueUSD
    }
  }
`;

type VersionRevenue = {
    totalAnnualRevenue: number;
    monthlyAverage: number;
    dailyLatest: number;
    dailyList: number[];
};

export async function fetchAaveVersionRevenue(
    subgraphUrl: string,
    apiKey: string
): Promise<VersionRevenue> {
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 86400 * 365;

    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    const { financialsDailySnapshots } = await client.request<{
        financialsDailySnapshots: { timestamp: number; dailyProtocolSideRevenueUSD: string }[];
    }>(AAVE_REVENUE_QUERY, {
        start: oneYearAgo,
        end: now,
    });

    const dailyRevenues = financialsDailySnapshots.map((snap) =>
        parseFloat(snap.dailyProtocolSideRevenueUSD)
    );

    const totalAnnualRevenue = dailyRevenues.reduce((sum, val) => sum + val, 0);

    const monthlyRevenues = dailyRevenues.slice(-30);

    const monthlyAverage =
        monthlyRevenues.length > 0
            ? monthlyRevenues.reduce((sum, val) => sum + val, 0)
            : 0;

    const dailyLatest =
        dailyRevenues.length > 0
            ? dailyRevenues[dailyRevenues.length - 1]
            : 0;

    return {
        totalAnnualRevenue,
        monthlyAverage,
        dailyLatest,
        dailyList: dailyRevenues,
    };
}




export async function introspectFields(subgraphUrl: string, apiKey: string) {
    const client = new GraphQLClient(subgraphUrl, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
        },
    });

    const query = gql`
    {
      __type(name: "FinancialsDailySnapshot") {
        fields {
          name
        }
      }
    }
  `;

    try {
        const res = await client.request(query);
        console.log("📦 Available fields:");
        const typedRes = res as { __type: { fields: { name: string }[] } };
        console.log(typedRes.__type.fields.map((f) => f.name).join('\n'));
    } catch (err) {
        console.error("❌ Introspection failed:", err);
    }
}

