// Earnings Quality Score (EQS) Model Implementation
import { ProjectRevenue } from './types';

// Interface for quarterly revenue data
interface QuarterData {
    quarter: string; // e.g., "2023-Q1"
    revenue: number;
    growth?: number; // Quarter-over-quarter growth percentage
}

// Interface for EQS model results
export interface EQSResult {
    projectName: string;
    stabilityScore: number;
    stabilityCategory: 'High' | 'Moderate' | 'Low';
    magnitudeScore: number;
    magnitudeCategory: 'High' | 'Moderate' | 'Low';
    eqsScore: number;
    qualityCategory: 'High' | 'Moderate' | 'Low';
    explanation: {
        stability: string;
        magnitude: string;
        overall: string;
    };
    details: {
        quarterlyData: QuarterData[];
        penalties: number[];
        avgMonthlyRevenue: number;
        maxAvgRevenue: number;
    };
}

/**
 * Calculates the Earnings Quality Score (EQS) for a cryptocurrency platform
 * @param projectRevenue - Revenue data for the project
 * @param maxAvgRevenue - Maximum average monthly revenue (for relative scaling)
 * @returns EQS result object with scores and explanations
 */
export function calculateEQS(
    projectRevenue: ProjectRevenue,
    maxAvgRevenue?: number
): EQSResult {
    // Step 1: Group monthly data into quarters
    const quarterlyData = groupMonthlyDataIntoQuarters(projectRevenue.monthlyData);

    // Step 2: Calculate quarter-over-quarter growth rates
    calculateQuarterlyGrowth(quarterlyData);

    // Step 3: Calculate stability score
    const { stabilityScore, penalties } = calculateStabilityScore(quarterlyData);

    // Step 4: Calculate magnitude score
    const avgMonthlyRevenue = calculateAverageMonthlyRevenue(projectRevenue.monthlyData);

    // If maxAvgRevenue is not provided, use the project's own revenue
    // (Note: This is a fallback and not ideal for comparing multiple projects)
    const effectiveMaxRevenue = maxAvgRevenue || avgMonthlyRevenue;

    const magnitudeScore = calculateMagnitudeScore(avgMonthlyRevenue, effectiveMaxRevenue);

    // Step 5: Calculate combined EQS
    const eqsScore = Math.round((stabilityScore * magnitudeScore) / 100);

    // Step 6: Generate explanations
    const explanation = generateExplanations(
        projectRevenue.name,
        stabilityScore,
        magnitudeScore,
        eqsScore
    );

    // Determine categories based on scores
    const stabilityCategory = categorizeScore(stabilityScore);
    const magnitudeCategory = categorizeScore(magnitudeScore);
    const qualityCategory = categorizeQualityScore(eqsScore);

    return {
        projectName: projectRevenue.name,
        stabilityScore,
        stabilityCategory,
        magnitudeScore,
        magnitudeCategory,
        eqsScore,
        qualityCategory,
        explanation,
        details: {
            quarterlyData,
            penalties,
            avgMonthlyRevenue,
            maxAvgRevenue: effectiveMaxRevenue
        }
    };
}

/**
 * Groups monthly revenue data into quarterly buckets
 */
function groupMonthlyDataIntoQuarters(
    monthlyData: { month: string; revenue: number }[]
): QuarterData[] {
    const quarterMap: Record<string, number> = {};

    // Sort monthly data by date (ascending)
    const sortedMonthlyData = [...monthlyData].sort((a, b) => a.month.localeCompare(b.month));

    sortedMonthlyData.forEach(({ month, revenue }) => {
        const [year, monthNum] = month.split('-');
        const quarterNum = Math.ceil(parseInt(monthNum) / 3);
        const quarterKey = `${year}-Q${quarterNum}`;

        if (!quarterMap[quarterKey]) {
            quarterMap[quarterKey] = 0;
        }

        quarterMap[quarterKey] += revenue;
    });

    // Convert to array and sort chronologically
    return Object.entries(quarterMap)
        .map(([quarter, revenue]) => ({ quarter, revenue }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter));
}



/**
 * Calculates quarter-over-quarter growth percentages
 * Modifies the quarterlyData array in place
 */
function calculateQuarterlyGrowth(quarterlyData: QuarterData[]): void {
    for (let i = 1; i < quarterlyData.length; i++) {
        const prevRevenue = quarterlyData[i - 1].revenue;
        const currRevenue = quarterlyData[i].revenue;

        if (prevRevenue > 0) {
            // Calculate growth as a percentage
            const growth = ((currRevenue - prevRevenue) / prevRevenue) * 100;
            quarterlyData[i].growth = Math.round(growth * 100) / 100; // Round to 2 decimal places
        } else {
            // If previous revenue was zero, growth is undefined or infinite
            quarterlyData[i].growth = undefined;
        }
    }
}

/**
 * Calculates stability score based on quarter-over-quarter growth
 * Uses the standard approach from the document with reasonable limits
 */
function calculateStabilityScore(quarterlyData: QuarterData[]): { stabilityScore: number; penalties: number[] } {
    // Add detailed logging
    console.log("\n--- STABILITY SCORE CALCULATION ---");
    console.log("Starting with base score of 100");

    // Base score starts at 100
    let baseScore = 100;
    const penalties: number[] = [];

    // Calculate total number of quarters with growth data
    const growthQuarters = quarterlyData.filter(q => q.growth !== undefined).length;
    console.log(`Found ${growthQuarters} quarters with growth data`);

    // Start from index 1 since first quarter has no growth rate
    for (let i = 1; i < quarterlyData.length; i++) {
        const growth = quarterlyData[i].growth;

        // Skip if growth is undefined
        if (growth === undefined) continue;

        console.log(`\nQuarter: ${quarterlyData[i].quarter}`);
        console.log(`Growth rate: ${growth}%`);

        // Apply penalties for growth exceeding ±20%
        const absGrowth = Math.abs(growth);
        if (absGrowth > 20) {
            // Standard penalty from document: 2 points per % over threshold
            const excessGrowth = absGrowth - 20;
            const rawPenalty = excessGrowth * 2;

            // Cap individual quarter penalties to ensure we don't excessively penalize
            // a single outlier quarter
            const cappedPenalty = Math.min(50, rawPenalty);

            console.log(`Excess growth: ${excessGrowth.toFixed(2)}% over 20% threshold`);
            console.log(`Raw penalty: ${rawPenalty.toFixed(2)} points (2 points per %)`);
            console.log(`Capped penalty: ${cappedPenalty.toFixed(2)} points (max 50 per quarter)`);

            penalties.push(Math.round(cappedPenalty * 10) / 10);
            baseScore -= cappedPenalty;
            console.log(`Base score after penalty: ${baseScore.toFixed(2)}`);
        } else {
            console.log(`No penalty (growth within ±20% threshold)`);
            penalties.push(0); // No penalty
        }
    }

    // Calculate average penalty per quarter to avoid overly penalizing
    // projects with more quarters of data
    if (growthQuarters > 0) {
        const totalPenalty = 100 - baseScore;
        const avgPenaltyPerQuarter = totalPenalty / growthQuarters;

        console.log(`\nTotal penalty: ${totalPenalty.toFixed(2)} points`);
        console.log(`Average penalty per quarter: ${avgPenaltyPerQuarter.toFixed(2)} points`);

        // If average penalty per quarter is excessive, scale it back
        if (avgPenaltyPerQuarter > 25) {
            // Scale to a more reasonable average of 25 points per quarter
            const oldBaseScore = baseScore;
            baseScore = 100 - (25 * growthQuarters);
            console.log(`Average penalty exceeded 25 points, scaling back total penalty`);
            console.log(`Adjusted base score: ${oldBaseScore.toFixed(2)} → ${baseScore.toFixed(2)}`);
        }
    }

    // Ensure score is between 20 and 100
    // 20 is the minimum to ensure even highly volatile projects get a meaningful score
    const stabilityScore = Math.max(20, Math.min(100, Math.round(baseScore)));
    console.log(`\nFinal stability score (after min/max limits): ${stabilityScore}`);

    return { stabilityScore, penalties };
}

/**
 * Calculates the average monthly revenue
 */
function calculateAverageMonthlyRevenue(monthlyData: { month: string; revenue: number }[]): number {
    if (monthlyData.length === 0) return 0;

    const totalRevenue = monthlyData.reduce((sum, data) => sum + data.revenue, 0);
    return Math.round((totalRevenue / monthlyData.length) * 100) / 100;
}

/**
 * Calculates magnitude score using logarithmic scaling
 */
function calculateMagnitudeScore(avgMonthlyRevenue: number, maxAvgRevenue: number): number {
    // Add detailed logging
    console.log("\n--- MAGNITUDE SCORE CALCULATION ---");
    console.log(`Average monthly revenue: ${avgMonthlyRevenue.toLocaleString()}`);
    console.log(`Maximum/benchmark revenue: ${maxAvgRevenue.toLocaleString()}`);

    // Prevent division by zero or log(0)
    if (maxAvgRevenue <= 0) {
        console.log("Maximum revenue is zero or negative, returning 0");
        return 0;
    }

    // Use logarithmic scaling as per the model specification
    const score = 100 * (Math.log(avgMonthlyRevenue + 1) / Math.log(maxAvgRevenue + 1));
    console.log(`Raw logarithmic score: ${score.toFixed(2)}`);

    // When analyzing a single protocol against itself, avoid 100% score
    const finalScore = (avgMonthlyRevenue === maxAvgRevenue)
        ? Math.min(95, Math.round(score)) // Cap at 95 for self-comparison
        : Math.round(score);

    console.log(`Final magnitude score: ${finalScore}`);

    return finalScore;
}

/**
 * Categorizes a score as High, Moderate, or Low
 * Using thresholds from the original document
 */
function categorizeScore(score: number): 'High' | 'Moderate' | 'Low' {
    if (score >= 80) return 'High';
    if (score >= 50) return 'Moderate';
    return 'Low';
}

/**
 * Categorizes the overall quality score
 * Using thresholds from the original document
 */
function categorizeQualityScore(score: number): 'High' | 'Moderate' | 'Low' {
    if (score >= 70) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Low';
}

/**
 * Generates human-readable explanations based on scores
 */
function generateExplanations(
    projectName: string,
    stabilityScore: number,
    magnitudeScore: number,
    eqsScore: number
): { stability: string; magnitude: string; overall: string } {
    // Stability explanation
    let stabilityExplanation = '';
    if (stabilityScore >= 80) {
        stabilityExplanation = `${projectName} has highly stable revenue, with quarter-over-quarter growth consistently within ±20%. This indicates reliable and predictable earnings.`;
    } else if (stabilityScore >= 50) {
        stabilityExplanation = `${projectName} has moderately stable revenue, but some quarters showed growth fluctuations exceeding ±20%. This suggests some inconsistency in earnings.`;
    } else {
        stabilityExplanation = `${projectName} has unstable revenue, with significant quarter-over-quarter growth fluctuations exceeding ±20%. This indicates unpredictable earnings.`;
    }

    // Magnitude explanation
    let magnitudeExplanation = '';
    if (magnitudeScore >= 80) {
        magnitudeExplanation = "The project generates a high volume of revenue compared to others, placing it among the top earners in its sector.";
    } else if (magnitudeScore >= 50) {
        magnitudeExplanation = "The project generates a moderate volume of revenue, performing averagely compared to other projects.";
    } else {
        magnitudeExplanation = "The project generates a low volume of revenue compared to others, indicating a smaller scale of operations.";
    }

    // Overall quality explanation
    let overallExplanation = '';
    if (eqsScore >= 70) {
        overallExplanation = `Overall, ${projectName} has high-quality earnings, combining strong revenue volume with consistent growth. This suggests a robust and sustainable revenue stream.`;
    } else if (eqsScore >= 40) {
        overallExplanation = `Overall, ${projectName} has moderate-quality earnings. While it may have decent revenue volume, inconsistent growth impacts its sustainability.`;
    } else {
        overallExplanation = `Overall, ${projectName} has low-quality earnings, likely due to a combination of low revenue volume and inconsistent growth. This suggests challenges in maintaining sustainable revenue.`;
    }

    return {
        stability: stabilityExplanation,
        magnitude: magnitudeExplanation,
        overall: overallExplanation
    };
}