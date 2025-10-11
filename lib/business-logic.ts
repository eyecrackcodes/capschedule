import { AgentRecord, Stats, Cohorts } from "@/types";

export function calculateStats(agents: AgentRecord[]): Stats {
  const totalAgents = agents.length;

  // Calculate company average CAP score using ONLY eligible agents (tenure > 1.9) AND non-zero CAP scores
  const agentsWithNonZeroCAP = agents.filter((agent) => agent.capScore > 0);
  const avgCAPScore =
    agentsWithNonZeroCAP.length > 0
      ? Math.round(
          (agentsWithNonZeroCAP.reduce(
            (sum, agent) => sum + agent.capScore,
            0
          ) /
            agentsWithNonZeroCAP.length) *
            10
        ) / 10
      : 0;

  // Count agents needing training (CAP Score < Company Average OR CAP Score = 0 OR needs metric training)
  const needsTraining = agents.filter(
    (agent) =>
      agent.capScore < avgCAPScore ||
      agent.capScore === 0 ||
      (agent.recommendedTraining && agent.recommendedTraining.length > 0)
  ).length;

  // Breakdown by location and tier
  const cltAgents = agents.filter((agent) => agent.site === "CHA");
  const atxAgents = agents.filter((agent) => agent.site === "AUS");

  const cltPerformance = cltAgents.filter((agent) => agent.tier === "P").length;
  const cltStandard = cltAgents.filter((agent) => agent.tier === "S").length;
  const atxPerformance = atxAgents.filter((agent) => agent.tier === "P").length;
  const atxStandard = atxAgents.filter((agent) => agent.tier === "S").length;

  return {
    totalAgents,
    eligibleCount: totalAgents, // All agents passed tenure filter
    excludedCount: 0, // Will be set by caller
    avgCAPScore,
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
  };
}

export function createCohorts(
  agents: AgentRecord[],
  maxSize: number = 5
): Cohorts & { zeroCAPAgents: { clt: AgentRecord[][]; atx: AgentRecord[][] } } {
  // Calculate average excluding zero CAP scores
  const agentsWithNonZeroCAP = agents.filter((agent) => agent.capScore > 0);
  const avgCAPScore =
    agentsWithNonZeroCAP.length > 0
      ? agentsWithNonZeroCAP.reduce((sum, agent) => sum + agent.capScore, 0) /
        agentsWithNonZeroCAP.length
      : 0;

  // Separate zero CAP score agents
  const zeroCAPAgents = agents.filter((agent) => agent.capScore === 0);
  const zeroCAPCLT = zeroCAPAgents.filter((agent) => agent.site === "CHA");
  const zeroCAPATX = zeroCAPAgents.filter((agent) => agent.site === "AUS");

  // Filter agents needing training (CAP Score < Company Average but > 0 OR needs specific metric training)
  const trainingAgents = agents.filter(
    (agent) =>
      agent.capScore > 0 &&
      (agent.capScore < avgCAPScore ||
        (agent.recommendedTraining &&
          agent.recommendedTraining.length > 0 &&
          !agent.recommendedTraining.includes(
            "Zero CAP Remediation - All Metrics"
          )))
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

  // Sort each group by CAP score (ascending - lowest first for highest priority)
  const sortByCAPScore = (a: AgentRecord, b: AgentRecord) =>
    a.capScore - b.capScore;

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
  const avgCAPScore =
    agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.capScore, 0) / agents.length
      : 0;

  return agents.filter((agent) => agent.capScore < avgCAPScore);
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

// Calculate 50th percentile (median) for each metric
export function calculateMetricPercentiles(agents: AgentRecord[]) {
  // Filter out agents with 0 values for percentile calculations
  const validCloseRates = agents
    .filter((a) => a.closeRate && a.closeRate > 0)
    .map((a) => a.closeRate!)
    .sort((a, b) => a - b);

  const validAnnualPremiums = agents
    .filter((a) => a.annualPremium && a.annualPremium > 0)
    .map((a) => a.annualPremium!)
    .sort((a, b) => a - b);

  const validPlaceRates = agents
    .filter((a) => a.placeRate && a.placeRate > 0)
    .map((a) => a.placeRate!)
    .sort((a, b) => a - b);

  const getMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  };

  return {
    closeRate50th: getMedian(validCloseRates),
    annualPremium50th: getMedian(validAnnualPremiums),
    placeRate50th: getMedian(validPlaceRates),
  };
}

// Determine which training each agent needs based on their weakest metric
export function assignTrainingRecommendations(
  agents: AgentRecord[],
  percentiles: ReturnType<typeof calculateMetricPercentiles>
): AgentRecord[] {
  return agents.map((agent) => {
    const recommendations: string[] = [];

    // For zero CAP agents, they need all training
    if (agent.capScore === 0) {
      recommendations.push("Zero CAP Remediation - All Metrics");
    } else {
      // Check each metric against 50th percentile
      const belowCloseRate =
        agent.closeRate !== undefined &&
        agent.closeRate < percentiles.closeRate50th;
      const belowAP =
        agent.annualPremium !== undefined &&
        agent.annualPremium < percentiles.annualPremium50th;
      const belowPlaceRate =
        agent.placeRate !== undefined &&
        agent.placeRate < percentiles.placeRate50th;

      if (belowCloseRate) recommendations.push("Close Rate Training");
      if (belowAP) recommendations.push("Annual Premium Training");
      if (belowPlaceRate) recommendations.push("Place Rate Training");

      // Don't add general training if they have specific metric training needs
      // General training is only for agents with no specific metric weaknesses
      // This should be handled elsewhere based on average CAP score
    }

    return {
      ...agent,
      recommendedTraining: recommendations,
    };
  });
}
