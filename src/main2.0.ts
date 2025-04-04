import { fetchProtocolRevenue } from './services/graphFetch2.0';
import { calculateEQS } from './services/eqsModel';
import { ProtocolConfig } from './services/types';
import { fetchAlgebraProtocolRevenue } from './services/graphFetch3.0';

// Example API key (replace with actual key)
const API_KEY = '14b6c406a25aab0b82b588a2891c7fef';

// Example protocol configurations
const protocols: ProtocolConfig[] = [
    // {
    //     name: 'Uniswap',
    //     symbol: 'UNI',
    //     category: 'DEX',
    //     subgraphs: {
    //         "Uniswap-V4-Eth": `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G`,
    //         "Uniswap-V3-Eth": `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`
    //     }
    // },
    // {
    //     name: 'Aerodrome',
    //     symbol: 'AERO',
    //     category: 'DEX',
    //     subgraphs: {
    //         "aerodrome": `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/GENunSHWLBXm59mBSgPzQ8metBEp9YDfdqwFr91Av1UM`,
    //     }
    // },
    // {
    //     name: 'Pharaoh',
    //     symbol: 'PHARAOH',
    //     category: 'DEX',
    //     subgraphs: {
    //         "Pharaoh-Avalanche": `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/NFHumrUD9wtBRnZnrvkQksZzKpic26uMM5RbZR56Gns`,
    //     }
    // },
    // Algebra DEX
    {
        name: 'QuickSwap',
        symbol: 'QUICK',
        category: 'DEX',
        subgraphs: {
            "QuickSwap-Matic": `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/FqsRcH1XqSjqVx9GRTvEJe959aCbKrcyGgDWBrUkG24g`,
        }
    },

    // Add more protocols as needed
];

/**
 * Main function to analyze a single protocol
 */
async function analyzeProtocol(protocol: ProtocolConfig): Promise<void> {
    try {
        console.log(`\n📊 Analyzing ${protocol.name}...`);

        // Step 1: Fetch revenue data including monthly breakdown
        // const revenueData = await fetchProtocolRevenue(
        //     protocol.subgraphs,
        //     API_KEY,
        //     protocol.symbol,
        //     protocol.name,
        //     protocol.category
        // );
        const revenueData = await fetchAlgebraProtocolRevenue(
            protocol.subgraphs,
            API_KEY,
            protocol.symbol,
            protocol.name,
            protocol.category
        );

        // Use a reasonable industry benchmark for magnitude scoring
        // This is a placeholder - in production you'd want to set this to a known value
        // or derive it from multiple protocols
        const industryBenchmark = 30000000; // $100M monthly revenue as benchmark

        // Step 2: Calculate EQS score
        const eqsResult = calculateEQS(revenueData, industryBenchmark);

        // Step 3: Output results
        console.log('\n✅ EQS Analysis Results:');
        console.log(`Project: ${eqsResult.projectName}`);
        console.log(`Stability Score: ${eqsResult.stabilityScore} (${eqsResult.stabilityCategory})`);
        console.log(`Magnitude Score: ${eqsResult.magnitudeScore} (${eqsResult.magnitudeCategory})`);
        console.log(`EQS Score: ${eqsResult.eqsScore} (${eqsResult.qualityCategory})`);

        console.log('\n📝 Explanations:');
        console.log(`Stability: ${eqsResult.explanation.stability}`);
        console.log(`Magnitude: ${eqsResult.explanation.magnitude}`);
        console.log(`Overall: ${eqsResult.explanation.overall}`);

        console.log('\n📈 Quarterly Data (excluding partial quarters):');
        // Filter out partial quarters from display
        const completeQuarters = eqsResult.details.quarterlyData.filter((q, i, arr) => {
            if (i === arr.length - 1 && arr.length >= 5) {
                const lastQuarter = arr[arr.length - 1];
                return !(lastQuarter.growth !== undefined && lastQuarter.growth < -80);
            }
            return true;
        });
        console.table(completeQuarters);

    } catch (error) {
        console.error(`Error analyzing ${protocol.name}:`, error);
    }
}

/**
 * Compare multiple protocols
 */
async function compareProtocols(protocolConfigs: ProtocolConfig[]): Promise<void> {
    try {
        console.log('\n🔍 Fetching data for multiple protocols to establish benchmarks...');

        // Step 1: Fetch data for all protocols
        const allRevenueData = await Promise.all(
            protocolConfigs.map(protocol =>
                fetchProtocolRevenue(
                    protocol.subgraphs,
                    API_KEY,
                    protocol.symbol,
                    protocol.name,
                    protocol.category
                )
            )
        );

        // Step 2: Calculate max average monthly revenue for magnitude benchmarking
        const avgMonthlyRevenues = allRevenueData.map(data => {
            const totalRevenue = data.monthlyData.reduce((sum, month) => sum + month.revenue, 0);
            return totalRevenue / data.monthlyData.length;
        });

        const maxAvgRevenue = Math.max(...avgMonthlyRevenues);
        console.log(`Maximum average monthly revenue across protocols: $${maxAvgRevenue.toFixed(2)}`);

        // Step 3: Calculate EQS for each protocol using the same benchmark
        const eqsResults = allRevenueData.map(data => calculateEQS(data, maxAvgRevenue));

        // Step 4: Display comparison results
        console.log('\n📊 Protocol Comparison:');
        console.table(eqsResults.map(result => ({
            'Protocol': result.projectName,
            'EQS Score': result.eqsScore,
            'Quality': result.qualityCategory,
            'Stability': result.stabilityScore,
            'Magnitude': result.magnitudeScore
        })));

        // Step 5: Detailed analysis for each protocol
        eqsResults.forEach(result => {
            console.log(`\n--- Detailed Analysis for ${result.projectName} ---`);
            console.log(`Stability: ${result.explanation.stability}`);
            console.log(`Magnitude: ${result.explanation.magnitude}`);
            console.log(`Overall: ${result.explanation.overall}`);
        });

    } catch (error) {
        console.error('Error comparing protocols:', error);
    }
}

/**
 * Main execution function
 */
async function main() {
    try {
        // Option 1: Analyze a single protocol
        await analyzeProtocol(protocols[0]);

        // Option 2: Compare multiple protocols
        // Uncomment the line below to run comparison
        // await compareProtocols(protocols);

    } catch (error) {
        console.error('Error in main execution:', error);
    }
}

// Run the main function
main().catch(console.error);