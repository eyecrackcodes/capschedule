import { AgentRecord, Stats, Cohorts } from "@/types";

export function calculateStats(agents: AgentRecord[]): Stats {
  const totalAgents = agents.length;

  // Filter out agents with 0 CAP score for average calculations
  const nonZeroCAPAgents = agents.filter((agent) => agent.capScore > 0);

  // Calculate average of RAW CAP scores (excluding zero scores)
  const avgCAPScore =
    nonZeroCAPAgents.length > 0
      ? Math.round(
          (nonZeroCAPAgents.reduce((sum, agent) => sum + agent.capScore, 0) /
            nonZeroCAPAgents.length) *
            10
        ) / 10
      : 0;

  // Calculate average of ADJUSTED CAP scores (excluding zero scores)
  const avgAdjustedCAPScore =
    nonZeroCAPAgents.length > 0
      ? Math.round(
          (nonZeroCAPAgents.reduce(
            (sum, agent) => sum + agent.adjustedCAPScore,
            0
          ) /
            nonZeroCAPAgents.length) *
            10
        ) / 10
      : 0;

  // For training eligibility, use the same non-zero CAP agents
  const eligibleAgents = nonZeroCAPAgents;

  // Count agents needing training
  // Use training-specific average (excluding zero CAP agents) for fair comparison
  const trainingAvgAdjustedCAP =
    eligibleAgents.length > 0
      ? eligibleAgents.reduce((sum, agent) => sum + agent.adjustedCAPScore, 0) /
        eligibleAgents.length
      : 0;

  const needsTraining = eligibleAgents.filter(
    (agent) => agent.adjustedCAPScore < trainingAvgAdjustedCAP
  ).length;

  // Breakdown by location and tier
  const cltAgents = agents.filter((agent) => agent.site === "CHA");
  const atxAgents = agents.filter((agent) => agent.site === "AUS");

  const cltPerformance = cltAgents.filter((agent) => agent.tier === "P").length;
  const cltStandard = cltAgents.filter((agent) => agent.tier === "S").length;
  const atxPerformance = atxAgents.filter((agent) => agent.tier === "P").length;
  const atxStandard = atxAgents.filter((agent) => agent.tier === "S").length;

  // Calculate tier-specific totals from ALL agents (including zero CAP)
  const allPerformanceAgents = agents.filter((a) => a.tier === "P");
  const allStandardAgents = agents.filter((a) => a.tier === "S");
  
  // Calculate tier-specific averages from non-zero CAP agents only
  const performanceAgents = nonZeroCAPAgents.filter((a) => a.tier === "P");
  const standardAgents = nonZeroCAPAgents.filter((a) => a.tier === "S");

  const performanceAvgCAP =
    performanceAgents.length > 0
      ? Math.round(
          (performanceAgents.reduce((sum, agent) => sum + agent.capScore, 0) /
            performanceAgents.length) *
            10
        ) / 10
      : 0;

  const performanceAvgAdjustedCAP =
    performanceAgents.length > 0
      ? Math.round(
          (performanceAgents.reduce(
            (sum, agent) => sum + agent.adjustedCAPScore,
            0
          ) /
            performanceAgents.length) *
            10
        ) / 10
      : 0;

  const standardAvgCAP =
    standardAgents.length > 0
      ? Math.round(
          (standardAgents.reduce((sum, agent) => sum + agent.capScore, 0) /
            standardAgents.length) *
            10
        ) / 10
      : 0;

  const standardAvgAdjustedCAP =
    standardAgents.length > 0
      ? Math.round(
          (standardAgents.reduce(
            (sum, agent) => sum + agent.adjustedCAPScore,
            0
          ) /
            standardAgents.length) *
            10
        ) / 10
      : 0;

  // Debug logging to verify adjusted is typically lower than raw
  console.log("Company-wide CAP averages:");
  console.log(
    `  Raw CAP: ${avgCAPScore} (from ${nonZeroCAPAgents.length} agents)`
  );
  console.log(`  Adjusted CAP: ${avgAdjustedCAPScore}`);
  console.log(
    `  Difference: ${(avgCAPScore - avgAdjustedCAPScore).toFixed(
      1
    )} (should be positive)`
  );
  console.log("\nTier-specific averages:");
  console.log(
    `  Performance - Raw: ${performanceAvgCAP}, Adjusted: ${performanceAvgAdjustedCAP} (${performanceAgents.length} agents)`
  );
  console.log(
    `  Standard - Raw: ${standardAvgCAP}, Adjusted: ${standardAvgAdjustedCAP} (${standardAgents.length} agents)`
  );

  return {
    totalAgents,
    eligibleCount: totalAgents, // All agents passed tenure filter
    excludedCount: 0, // Will be set by caller
    avgCAPScore,
    avgAdjustedCAPScore,
    needsTraining,
    clt: {
      performance: cltPerformance,
      standard: cltStandard,
      total: cltAgents.length,
    },
    atx: {
      performance: atxPerformance,
      standard: atxStandard,
      total: atxAgents.length,
    },
    byTier: {
      performance: {
        avgCAPScore: performanceAvgCAP,
        avgAdjustedCAPScore: performanceAvgAdjustedCAP,
        agentCount: performanceAgents.length, // Non-zero CAP agents for training
        totalAgentCount: allPerformanceAgents.length, // All agents in tier
      },
      standard: {
        avgCAPScore: standardAvgCAP,
        avgAdjustedCAPScore: standardAvgAdjustedCAP,
        agentCount: standardAgents.length, // Non-zero CAP agents for training
        totalAgentCount: allStandardAgents.length, // All agents in tier
      },
    },
  };
}

export function createCohorts(
  agents: AgentRecord[],
  maxSize: number = 3 // Changed from 5 to 3 for more intimate training
): Cohorts & { zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] } } {
  // Filter out agents with 0 original CAP score - they are not eligible for training
  const eligibleAgents = agents.filter((agent) => agent.capScore > 0);

  // Calculate average excluding zero ADJUSTED CAP scores
  const agentsWithNonZeroCAP = eligibleAgents.filter(
    (agent) => agent.adjustedCAPScore > 0
  );
  const avgAdjustedCAPScore =
    agentsWithNonZeroCAP.length > 0
      ? agentsWithNonZeroCAP.reduce(
          (sum, agent) => sum + agent.adjustedCAPScore,
          0
        ) / agentsWithNonZeroCAP.length
      : 0;

  // No more zero CAP agents in training - they are excluded
  const zeroCAPAgents: AgentRecord[] = [];
  const zeroCAPCLT: AgentRecord[] = [];
  const zeroCAPATX: AgentRecord[] = [];

  // Filter agents needing training (Adjusted CAP Score < Company Average Adjusted CAP ONLY)
  // Metric recommendations just determine which day/type of training, not eligibility
  const trainingAgents = eligibleAgents.filter(
    (agent) =>
      agent.adjustedCAPScore > 0 && agent.adjustedCAPScore < avgAdjustedCAPScore
  );

  // Group by location and tier
  const cltPerformance = trainingAgents.filter(
    (agent) => agent.site === "CHA" && agent.tier === "P"
  );
  const cltStandard = trainingAgents.filter(
    (agent) => agent.site === "CHA" && agent.tier === "S"
  );
  const atxPerformance = trainingAgents.filter(
    (agent) => agent.site === "AUS" && agent.tier === "P"
  );
  const atxStandard = trainingAgents.filter(
    (agent) => agent.site === "AUS" && agent.tier === "S"
  );

  // Debug logging
  console.log("Training agents breakdown:");
  console.log(`Total training agents: ${trainingAgents.length}`);
  console.log(`CLT Performance: ${cltPerformance.length}`);
  console.log(`CLT Standard: ${cltStandard.length}`);
  console.log(`ATX Performance: ${atxPerformance.length}`);
  console.log(`ATX Standard: ${atxStandard.length}`);

  // Sort each group by ADJUSTED CAP score (ascending - lowest first for highest priority)
  const sortByCAPScore = (a: AgentRecord, b: AgentRecord) =>
    a.adjustedCAPScore - b.adjustedCAPScore;

  cltPerformance.sort(sortByCAPScore);
  cltStandard.sort(sortByCAPScore);
  atxPerformance.sort(sortByCAPScore);
  atxStandard.sort(sortByCAPScore);

  // Create cohorts of max 5 agents each
  const createCohortGroups = (agentList: AgentRecord[]) => {
    const cohorts: AgentRecord[][] = [];
    for (let i = 0; i < agentList.length; i += maxSize) {
      cohorts.push(agentList.slice(i, i + maxSize));
    }
    return cohorts;
  };

  return {
    cltPerformance: createCohortGroups(cltPerformance),
    cltStandard: createCohortGroups(cltStandard),
    atxPerformance: createCohortGroups(atxPerformance),
    atxStandard: createCohortGroups(atxStandard),
    zeroCAPAgents: {
      clt: createCohortGroups(zeroCAPCLT),
      atx: createCohortGroups(zeroCAPATX),
    },
  };
}

export function getTrainingEligibleAgents(
  agents: AgentRecord[]
): AgentRecord[] {
  // Filter out zero CAP scores for fair comparison
  const nonZeroCAPAgents = agents.filter((agent) => agent.capScore > 0);

  const avgAdjustedCAPScore =
    nonZeroCAPAgents.length > 0
      ? nonZeroCAPAgents.reduce(
          (sum, agent) => sum + agent.adjustedCAPScore,
          0
        ) / nonZeroCAPAgents.length
      : 0;

  return nonZeroCAPAgents.filter(
    (agent) => agent.adjustedCAPScore < avgAdjustedCAPScore
  );
}

export function getPriorityLevel(
  capScore: number,
  avgCAPScore: number
): "HIGH" | "MEDIUM" | "LOW" {
  const difference = avgCAPScore - capScore;

  if (difference >= 20) return "HIGH";
  if (difference >= 10) return "MEDIUM";
  return "LOW";
}

export function getSiteDisplayName(site: "CHA" | "AUS"): "CLT" | "ATX" {
  return site === "CHA" ? "CLT" : "ATX";
}

// Calculate percentiles for metrics by tier
export function calculatePercentilesByTier(agents: AgentRecord[]) {
  // Separate by tier
  const performanceAgents = agents.filter(
    (a) => a.tier === "P" && a.capScore > 0
  );
  const standardAgents = agents.filter((a) => a.tier === "S" && a.capScore > 0);

  const calculatePercentile = (
    values: number[],
    percentile: number
  ): number => {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index] || 0;
  };

  // Calculate 25th percentile (bottom quartile) for each metric
  const performanceMetrics = {
    closeRate25th: calculatePercentile(
      performanceAgents
        .map((a) => a.closeRate)
        .filter((v): v is number => v !== undefined && v !== null && v > 0),
      25
    ),
    annualPremium25th: calculatePercentile(
      performanceAgents
        .map((a) => a.annualPremium)
        .filter((v): v is number => v !== undefined && v !== null && v > 0),
      25
    ),
    placeRate25th: calculatePercentile(
      // Include 0 values for place rate but only from agents who have attempted placements
      performanceAgents
        .map((a) => a.placeRate)
        .filter((v): v is number => v !== undefined && v !== null),
      25
    ),
  };

  const standardMetrics = {
    closeRate25th: calculatePercentile(
      standardAgents
        .map((a) => a.closeRate)
        .filter((v): v is number => v !== undefined && v !== null && v > 0),
      25
    ),
    annualPremium25th: calculatePercentile(
      standardAgents
        .map((a) => a.annualPremium)
        .filter((v): v is number => v !== undefined && v !== null && v > 0),
      25
    ),
    placeRate25th: calculatePercentile(
      // Include 0 values for place rate but only from agents who have attempted placements
      standardAgents
        .map((a) => a.placeRate)
        .filter((v): v is number => v !== undefined && v !== null),
      25
    ),
  };

  return {
    performance: performanceMetrics,
    standard: standardMetrics,
  };
}

export function getTierDisplayName(
  tier: "P" | "S"
): "Performance" | "Standard" {
  return tier === "P" ? "Performance" : "Standard";
}

// Get location-specific time display
export function getLocationTime(
  timeSlot: string,
  location: "CLT" | "ATX"
): string {
  // Extract the appropriate time based on location
  if (location === "ATX") {
    // Return CST time (first part)
    const cstMatch = timeSlot.match(
      /(\d{1,2}:\d{2}-\d{1,2}:\d{2} (?:AM|PM) CST)/
    );
    return cstMatch ? cstMatch[1] : timeSlot;
  } else {
    // Return EST time (second part)
    const estMatch = timeSlot.match(
      /(\d{1,2}:\d{2} (?:AM|PM)-\d{1,2}:\d{2} (?:PM|AM) EST|\d{1,2}:\d{2}-\d{1,2}:\d{2} (?:AM|PM) EST)/
    );
    return estMatch ? estMatch[1] : timeSlot;
  }
}

// Calculate 25th percentile (bottom quartile) for each metric by tier
// This targets only the lowest 25% of performers in each metric
export function calculateMetricPercentiles(agents: AgentRecord[]) {
  // Separate agents by tier
  const performanceAgents = agents.filter((a) => a.tier === "P");
  const standardAgents = agents.filter((a) => a.tier === "S");

  // Calculate 25th percentile (bottom quartile)
  const get25thPercentile = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const index = Math.floor(arr.length * 0.25);
    return arr[index];
  };

  // Calculate percentiles for Performance tier
  const perfCloseRates = performanceAgents
    .filter((a) => a.closeRate && a.closeRate > 0)
    .map((a) => a.closeRate!)
    .sort((a, b) => a - b);

  const perfAnnualPremiums = performanceAgents
    .filter((a) => a.annualPremium && a.annualPremium > 0)
    .map((a) => a.annualPremium!)
    .sort((a, b) => a - b);

  // Include 0 values for place rate but don't penalize agents
  const perfPlaceRates = performanceAgents
    .filter((a) => a.placeRate !== undefined && a.placeRate !== null)
    .map((a) => a.placeRate!)
    .sort((a, b) => a - b);

  // Calculate percentiles for Standard tier
  const stdCloseRates = standardAgents
    .filter((a) => a.closeRate && a.closeRate > 0)
    .map((a) => a.closeRate!)
    .sort((a, b) => a - b);

  const stdAnnualPremiums = standardAgents
    .filter((a) => a.annualPremium && a.annualPremium > 0)
    .map((a) => a.annualPremium!)
    .sort((a, b) => a - b);

  // Include 0 values for place rate but don't penalize agents
  const stdPlaceRates = standardAgents
    .filter((a) => a.placeRate !== undefined && a.placeRate !== null)
    .map((a) => a.placeRate!)
    .sort((a, b) => a - b);

  const result = {
    performance: {
      closeRate50th: get25thPercentile(perfCloseRates),
      annualPremium50th: get25thPercentile(perfAnnualPremiums),
      placeRate50th: get25thPercentile(perfPlaceRates),
    },
    standard: {
      closeRate50th: get25thPercentile(stdCloseRates),
      annualPremium50th: get25thPercentile(stdAnnualPremiums),
      placeRate50th: get25thPercentile(stdPlaceRates),
    },
  };
  
  console.log("📊 25th Percentile Thresholds Calculated:");
  console.log("Performance Tier:", {
    closeRate: result.performance.closeRate50th,
    annualPremium: result.performance.annualPremium50th,
    placeRate: result.performance.placeRate50th,
    sampleSize: performanceAgents.length
  });
  console.log("Standard Tier:", {
    closeRate: result.standard.closeRate50th,
    annualPremium: result.standard.annualPremium50th,
    placeRate: result.standard.placeRate50th,
    sampleSize: standardAgents.length
  });
  
  return result;
}

// Determine which training each agent needs based on their weakest metric
export function assignTrainingRecommendations(
  agents: AgentRecord[],
  percentiles: ReturnType<typeof calculateMetricPercentiles>
): AgentRecord[] {
  return agents.map((agent) => {
    const recommendations: string[] = [];

    // Skip agents with 0 original CAP score - they are not eligible for training
    if (agent.capScore === 0) {
      return {
        ...agent,
        recommendedTraining: [],
      };
    }

    // For agents with valid original CAP scores, check their metrics
    // Get the appropriate percentiles based on agent's tier
    const tierPercentiles =
      agent.tier === "P" ? percentiles.performance : percentiles.standard;

    // Check each metric against tier-specific 25th percentile (bottom quartile)
    // Only the worst 25% of performers in each metric get targeted training
    const belowCloseRate =
      agent.closeRate !== undefined &&
      agent.closeRate < tierPercentiles.closeRate50th;
    const belowAP =
      agent.annualPremium !== undefined &&
      agent.annualPremium < tierPercentiles.annualPremium50th;
    const belowPlaceRate =
      agent.placeRate !== undefined &&
      agent.placeRate < tierPercentiles.placeRate50th;

    if (belowCloseRate) recommendations.push("Close Rate Training");
    if (belowAP) recommendations.push("Annual Premium Training");
    if (belowPlaceRate) recommendations.push("Place Rate Training");

    return {
      ...agent,
      recommendedTraining: recommendations,
    };
  });
}
