import Papa from "papaparse";
import { AgentRecord } from "@/types";

export interface ParseResult {
  success: boolean;
  data?: AgentRecord[];
  error?: string;
  stats?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    excludedByTenure: number;
  };
}

export function parseCAPFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      delimiter: "\t", // Tab-separated values
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed = parseResults(results.data as string[][]);
          resolve(parsed);
        } catch (error) {
          resolve({
            success: false,
            error:
              error instanceof Error ? error.message : "Unknown parsing error",
          });
        }
      },
      error: (error) => {
        resolve({
          success: false,
          error: `File parsing error: ${error.message}`,
        });
      },
    });
  });
}

function parseResults(data: string[][]): ParseResult {
  if (data.length < 3) {
    return {
      success: false,
      error: "File must contain at least 3 rows (header + 2 data rows)",
    };
  }

  // Skip first row (contains "Performance Queue" header with tabs)
  // Use second row as column headers
  // Parse from row 3 onwards as data
  const dataRows = data.slice(2);
  const agents: AgentRecord[] = [];
  let validRows = 0;
  let invalidRows = 0;
  let excludedByTenure = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 3; // Account for skipped rows

    try {
      const agent = parseAgentRow(row, rowNumber);

      // Apply tenure filter: exclude agents with tenure ≤ 1.9 years
      if (agent.tenure <= 1.9) {
        excludedByTenure++;
        continue;
      }

      agents.push(agent);
      validRows++;
    } catch (error) {
      invalidRows++;
      console.warn(`Invalid row ${rowNumber}:`, error);
    }
  }

  return {
    success: true,
    data: agents,
    stats: {
      totalRows: dataRows.length,
      validRows,
      invalidRows,
      excludedByTenure,
    },
  };
}

function parseAgentRow(row: string[], rowNumber: number): AgentRecord {
  if (row.length < 10) {
    throw new Error(
      `Row ${rowNumber}: Insufficient columns (expected at least 10 for CAP score, got ${row.length})`
    );
  }

  // Debug logging for first few rows
  if (rowNumber <= 5) {
    console.log(`Row ${rowNumber} data:`, row);
  }

  // Column mapping based on your file structure:
  // 0: Tenure, 1: Q (tier), 2: Site, 3: MANAGER, 4: (empty), 5: WoW Delta,
  // 6: Prior Rank, 7: Current Rank, 8: Sales Agent, 9: CAP Score, 10: Leads Per Day
  const tenure = parseFloat(row[0]?.trim() || "0");
  const tier = row[1]?.trim() as "P" | "S";
  const siteRaw = row[2]?.trim().toUpperCase() || "";
  let site: "CHA" | "AUS";

  // Handle potential variations in site naming
  if (siteRaw === "CHA" || siteRaw === "CHARLOTTE" || siteRaw === "CLT") {
    site = "CHA";
  } else if (siteRaw === "AUS" || siteRaw === "AUSTIN" || siteRaw === "ATX") {
    site = "AUS";
  } else {
    // If we can't match, use the raw value and let validation catch it
    site = siteRaw as "CHA" | "AUS";
  }
  const manager = row[3]?.trim() || "";
  const wowDelta = parseInt(row[5]?.trim() || "0", 10); // Skip column 4 (empty)
  const priorRank = parseInt(row[6]?.trim() || "0", 10);
  const currentRank = parseInt(row[7]?.trim() || "0", 10);
  const name = row[8]?.trim() || ""; // Sales Agent is in column 8, not 7

  // Handle CAP score - it might be in a different column or have special formatting
  let capScore = 0;

  // CAP score is in column 9
  let capScoreStr = row[9]?.trim() || "";
  
  // Leads Per Day is in column 10
  let leadsPerDay = 0;
  const leadsPerDayStr = row[10]?.trim() || "";
  if (leadsPerDayStr) {
    const cleanedLeads = leadsPerDayStr.replace(/[^0-9.-]/g, "");
    leadsPerDay = parseFloat(cleanedLeads) || 0;
  }

  // Parse the performance metrics
  let closeRate = 0;
  let annualPremium = 0;
  let placeRate = 0;

  // Close Rate (column 11) - remove % sign
  const closeRateStr = row[11]?.trim() || "";
  if (closeRateStr) {
    const cleanedRate = closeRateStr.replace(/[^0-9.-]/g, "");
    closeRate = parseFloat(cleanedRate) || 0;
  }

  // Annual Premium per Sale (column 12) - remove $ sign
  const apStr = row[12]?.trim() || "";
  if (apStr) {
    const cleanedAP = apStr.replace(/[^0-9.-]/g, "");
    annualPremium = parseFloat(cleanedAP) || 0;
  }

  // Place Rate (column 13) - remove % sign
  const placeRateStr = row[13]?.trim() || "";
  if (placeRateStr) {
    const cleanedPlace = placeRateStr.replace(/[^0-9.-]/g, "");
    placeRate = parseFloat(cleanedPlace) || 0;
  }

  if (capScoreStr && capScoreStr !== "") {
    // Remove any non-numeric characters (like $, %, commas)
    const cleanedScore = capScoreStr.replace(/[^0-9.-]/g, "");
    capScore = parseInt(cleanedScore, 10);
    if (isNaN(capScore)) {
      capScore = 0; // Default to 0 if still not a valid number
    }
  }

  // Calculate Lead Attainment (capped at 100%)
  // Formula: (Leads Per Day / 8) * 100, max 100%
  const leadAttainment = Math.min((leadsPerDay / 8) * 100, 100);
  
  // Calculate Adjusted CAP Score
  // Adjusted CAP = Original CAP * (Lead Attainment / 100)
  const adjustedCAPScore = Math.round(capScore * (leadAttainment / 100));

  // Debug log the parsed values for first few rows
  if (rowNumber <= 5) {
    console.log(
      `Row ${rowNumber} - Name: ${name}, Site: "${site}" (raw: "${row[2]}"), Manager: "${manager}", CAP: ${capScore}, Leads/Day: ${leadsPerDay}, Attainment: ${leadAttainment.toFixed(1)}%, Adjusted CAP: ${adjustedCAPScore}, Close Rate: ${closeRate}%, AP: $${annualPremium}, Place Rate: ${placeRate}%`
    );
  }

  // Validation
  if (isNaN(tenure)) {
    throw new Error(`Row ${rowNumber}: Invalid tenure value`);
  }

  if (!["P", "S"].includes(tier)) {
    throw new Error(`Row ${rowNumber}: Invalid tier (must be P or S)`);
  }

  if (!["CHA", "AUS"].includes(site)) {
    throw new Error(
      `Row ${rowNumber}: Invalid site "${siteRaw}" (must be CHA/Charlotte or AUS/Austin)`
    );
  }

  if (!name) {
    throw new Error(`Row ${rowNumber}: Missing agent name`);
  }

  // Get email if it exists (last column in your file)
  const email = row.length > 39 ? row[39]?.trim() || undefined : undefined;

  return {
    tenure,
    tier,
    site,
    manager,
    wowDelta,
    priorRank,
    currentRank,
    name,
    capScore,
    leadsPerDay,
    leadAttainment,
    adjustedCAPScore,
    email,
    closeRate,
    annualPremium,
    placeRate,
  };
}

export function validateFileStructure(
  file: File
): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (
      !file.name.toLowerCase().endsWith(".csv") &&
      !file.name.toLowerCase().endsWith(".tsv")
    ) {
      resolve({
        valid: false,
        error: "File must be a CSV or TSV file",
      });
      return;
    }

    Papa.parse(file, {
      delimiter: "\t",
      header: false,
      preview: 3, // Only read first 3 rows for validation
      complete: (results) => {
        const data = results.data as string[][];

        if (data.length < 3) {
          resolve({
            valid: false,
            error: "File must contain at least 3 rows",
          });
          return;
        }

        // Check if second row has enough columns
        if (data[1].length < 9) {
          resolve({
            valid: false,
            error: `File must have at least 9 columns (found ${data[1].length})`,
          });
          return;
        }

        resolve({ valid: true });
      },
      error: () => {
        resolve({
          valid: false,
          error: "Unable to read file. Please check file format.",
        });
      },
    });
  });
}
