import { fetchAaveVersionRevenue, introspectFields, introspectAllTypes } from './services/fetchEthereumRevenue';
import { fetchAaveRevenue } from "./services/newFetch";
import { getAggregateAaveRevenue } from "./services/fetchAaveVersions";
import { fetchUniswapRevenue } from "./services/graphFetch";
import { fetchUniswapRevenueFromDayData } from "./services/graphFetch2.0";
import { fetchAlgebraRevenue } from './services/graphFetch3.0';

const apiKey = '14b6c406a25aab0b82b588a2891c7fef';

// list of subgraphs for Uniswap




// Define an interface for project configurations
interface ProjectConfig {
    [projectName: string]: {
        [versionName: string]: string; // URL for each version/chain
    };
}

// Centralized project configurations
const projectConfigs: ProjectConfig = {
    // "Aave": {
    //     "V3 Ethereum": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk`,
    //     "V2 Ethereum": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/C2zniPn45RnLDGzVeGZCx2Sw3GXrbc9gL4ZfL8B8Em2j`,
    //     "V3 Arbitrum": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/4xyasjQeREe7PxnF6wVdobZvCw5mhoHZq3T7guRpuNPf`,
    //     "V3 Polygon": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/6yuf1C49aWEscgk5n9D1DekeG1BCk5Z9imJYJT3sVmAT`,
    //     "V3 Optimism": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/3RWFxWNstn4nP3dXiDfKi9GgBoHx7xzc7APkXs1MLEgi`,
    // },

    // "PancakeSwap": {
    //     "V3 BSC": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/A1BC1hzDsK4NTeXBpKQnDBphngpYZAwDUF7dEBfa3jHK`,
    //     "V3 Ethereum": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/JAGXF8B14mpB8QGKnwhKTs5JxsQZBJQvbDGFcWwL7gbm`,
    // },

    // "Lido": {
    //     " Lido Ethereum": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/F7qb71hWab6SuRL5sf6LQLTpNahmqMsBnnweYHzLGUyG`,
    // },

    // "Venus": {
    //     "Venus BSC": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/CwswJ7sfENafqgAYU1upn3hQgoEV2CXXRZRJ7XtgJrKG`,
    // },

    "LFG": {
        "Banker Joe Avalanche": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/9NjYuG2BFU1BPacNdKymd9eNdfVCaJM6LhsgD8zSQgDK`,
    }


    // "Aerodrome": {
    //     "Base Full": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/GENunSHWLBXm59mBSgPzQ8metBEp9YDfdqwFr91Av1UM`
    // },
    // Easy to add more projects here
    // "Another Project": { ... }
};

async function fetchProjectRevenue(projectName: string) {
    const projectUrls = projectConfigs[projectName];
    if (!projectUrls) {
        throw new Error(`No configuration found for project: ${projectName}`);
    }

    const promises = Object.entries(projectUrls).map(([versionName, url]) =>
        fetchAaveRevenue(url, apiKey).catch(error => {
            console.error(`Error fetching revenue for ${projectName} - ${versionName}:`, error);
            return null;
        })
    );

    const results = await Promise.all(promises);
    const validResults = results.filter(result => result !== null);

    if (validResults.length === 0) {
        throw new Error(`No valid revenue data found for ${projectName}`);
    }

    // Calculate project-level totals
    const totalDaily = validResults.reduce((sum, r) => sum + r.revenue.daily, 0);
    const totalMonthly = validResults.reduce((sum, r) => sum + r.revenue.monthly, 0);
    const totalAnnual = validResults.reduce((sum, r) => sum + r.revenue.annualized, 0);

    return {
        projectName,
        versions: validResults,
        totals: {
            daily: totalDaily,
            monthly: totalMonthly,
            annual: totalAnnual
        }
    };
}

async function main() {
    try {
        // Fetch revenue for multiple projects
        const projectResults = await Promise.all(
            Object.keys(projectConfigs).map(fetchProjectRevenue)
        );

        // Display results for each project
        projectResults.forEach(project => {
            console.log(`\n${project.projectName} REVENUE:`);

            // Display individual version revenues
            project.versions.forEach(version => {
                console.log(`\n${version.name} revenue:`);
                console.log(`Daily: $${version.revenue.daily.toLocaleString()}`);
                console.log(`Monthly: $${version.revenue.monthly.toLocaleString()}`);
                console.log(`Annual: $${version.revenue.annualized.toLocaleString()}`);
            });

            // Display project-level totals
            console.log(`\nTOTAL ${project.projectName.toUpperCase()} REVENUE:`);
            console.log(`Daily: $${project.totals.daily.toLocaleString()}`);
            console.log(`Monthly: $${project.totals.monthly.toLocaleString()}`);
            console.log(`Annual: $${project.totals.annual.toLocaleString()}`);
        });

    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

// main();


// uniswap day datas
const uniswapSubgraphs = {
    "Uniswap-V4-Eth": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G`,
    "Uniswap-V3-Eth": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`
};


const aerodromeSubgraphs = {
    "Aerodrome": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/GENunSHWLBXm59mBSgPzQ8metBEp9YDfdqwFr91Av1UM`
};

// 
const pharaohSubgraphs = {
    "Pharaoh-Avalanche": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/NFHumrUD9wtBRnZnrvkQksZzKpic26uMM5RbZR56Gns`
};



// aglebra
const QuickSwapSubgraphs = {
    "QuickSwap-Matic": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`
};

// const QuickSwapSubgraphs = {
//     "QuickSwap-Matic": `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/6K19ca6rG5cDS7ZPdfVbEtgUAT3B7wjqTu6wpyXvqNJJ`
// };

async function graphMain() {
    try {
        // Collect all version revenues
        const revenues = [];

        for (const [version, url] of Object.entries(QuickSwapSubgraphs)) {
            try {
                console.log(`Fetching ${version}...`);
                // const revenue = await fetchUniswapRevenueFromDayData(url, apiKey);
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
        const totalRevenue = {
            symbol: "UNI",
            name: "Uniswap",
            category: "DEX",
            revenue: {
                daily: 0,
                monthly: 0,
                annualized: 0
            }
        };

        revenues.forEach(rev => {
            totalRevenue.revenue.daily += rev.revenue.daily;
            totalRevenue.revenue.monthly += rev.revenue.monthly;
            totalRevenue.revenue.annualized += rev.revenue.annualized;
        });

        // Round to 2 decimal places
        totalRevenue.revenue.daily = Math.round(totalRevenue.revenue.daily * 100) / 100;
        totalRevenue.revenue.monthly = Math.round(totalRevenue.revenue.monthly * 100) / 100;
        totalRevenue.revenue.annualized = Math.round(totalRevenue.revenue.annualized * 100) / 100;

        console.log("\nTotal Uniswap Revenue:", totalRevenue);
        return totalRevenue;
    } catch (error) {
        console.error("Error in main execution:", error);
        throw error;
    }
}

graphMain();

// (async () => {
//     const data = await fetchAaveVersionRevenue(
//         'https://gateway.thegraph.com/api/14b6c406a25aab0b82b588a2891c7fef/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk',
//         '14b6c406a25aab0b82b588a2891c7fef'
//     );
//     console.log(JSON.stringify(data, null, 2));
// })();


// (async () => {
//     const fields = await introspectAllTypes(
//         `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`,
//         '14b6c406a25aab0b82b588a2891c7fef'
//     );
//     console.log(fields);
// })();



