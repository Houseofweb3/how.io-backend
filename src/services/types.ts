// Type definitions shared across files

// Revenue data for a project including monthly breakdown
export interface ProjectRevenue {
    symbol: string;
    name: string;
    category: string;
    revenue: {
        daily: number;
        monthly: number;
        annualized: number;
    };
    // Monthly revenue data for past 13+ months
    monthlyData: {
        month: string; // YYYY-MM format
        revenue: number;
    }[];
}

// Configuration for known protocols and their subgraphs
export interface ProtocolConfig {
    name: string;
    symbol: string;
    category: string;
    subgraphs: Record<string, string>;
}