import { DaySchedule, AgentRecord } from "@/types";
import jsPDF from "jspdf";

export function exportToCSV(
  schedule: DaySchedule[],
  filters?: { location: string; tier: string },
  weekOf?: string
): void {
  // Filter schedule if filters provided
  const filteredSchedule = schedule
    .map((day) => ({
      ...day,
      sessions: day.sessions.filter((session) => {
        if (filters?.location !== "all" && session.location !== filters?.location)
          return false;
        if (
          filters?.tier !== "all" &&
          session.tier.toLowerCase() !== filters?.tier
        )
          return false;
        return true;
      }),
    }))
    .filter((day) => day.sessions.length > 0);

  const csvData: string[][] = [];

  // Headers
  csvData.push([
    "Day",
    "Time",
    "Location",
    "Tier",
    "Priority",
    "Cohort Number",
    "Agent Name",
    "Manager",
    "Adjusted CAP Score",
    "Original CAP Score",
    "Lead Attainment %",
    "Leads Per Day",
    "Tenure",
    "Site",
    "Tier Code",
  ]);

  // Data rows
  filteredSchedule.forEach((day) => {
    day.sessions.forEach((session) => {
      session.agents.forEach((agent) => {
        csvData.push([
          day.day,
          session.time,
          session.location,
          session.tier,
          session.priority,
          session.cohortNumber.toString(),
          agent.name,
          agent.manager,
          agent.adjustedCAPScore.toString(),
          agent.capScore.toString(),
          agent.leadAttainment.toFixed(1),
          agent.leadsPerDay.toString(),
          agent.tenure.toString(),
          agent.site,
          agent.tier,
        ]);
      });
    });
  });

  // Convert to CSV string
  const csvString = csvData
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  // Download with filter info in filename
  const blob = new Blob([csvString], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  
  let filename = `cap-training-schedule`;
  if (weekOf) {
    filename += `-${weekOf}`;
  }
  if (filters && filters.location !== "all") {
    filename += `-${filters.location}`;
  }
  if (filters && filters.tier !== "all") {
    filename += `-${filters.tier}`;
  }
  filename += `.csv`;
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function exportToPDF(
  schedule: DaySchedule[],
  filters?: { location: string; tier: string },
  weekOf?: string
): void {
  // Filter schedule if filters provided
  const filteredSchedule = schedule
    .map((day) => ({
      ...day,
      sessions: day.sessions.filter((session) => {
        if (filters?.location !== "all" && session.location !== filters?.location)
          return false;
        if (
          filters?.tier !== "all" &&
          session.tier.toLowerCase() !== filters?.tier
        )
          return false;
        return true;
      }),
    }))
    .filter((day) => day.sessions.length > 0);

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.text("CAP Training Schedule", pageWidth / 2, yPosition, {
    align: "center",
  });
  yPosition += 20;

  // Week and filters info
  pdf.setFontSize(12);
  let subtitle = `Generated: ${new Date().toLocaleDateString()}`;
  if (weekOf) {
    subtitle += ` | Week of ${new Date(weekOf).toLocaleDateString()}`;
  }
  if (filters?.location !== "all") {
    subtitle += ` | ${filters.location} Only`;
  }
  if (filters?.tier !== "all") {
    subtitle += ` | ${filters.tier.charAt(0).toUpperCase() + filters.tier.slice(1)} Tier`;
  }
  pdf.text(subtitle, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 30;

  // Schedule
  filteredSchedule.forEach((day) => {
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = 20;
    }

    // Day header
    pdf.setFontSize(14);
    pdf.text(day.day, 20, yPosition);
    yPosition += 15;

    // Sessions
    day.sessions.forEach((session) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      const sessionText = `${session.time} - ${session.location} ${session.tier} (${session.agents.length} agents)`;
      pdf.text(sessionText, 30, yPosition);
      yPosition += 10;

      // Agent details
      session.agents.forEach((agent) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        const agentText = `  • ${agent.name} (${agent.manager}) - Adj CAP: ${agent.adjustedCAPScore} (Orig: ${agent.capScore}, ${agent.leadAttainment.toFixed(0)}% Attain)`;
        pdf.text(agentText, 40, yPosition);
        yPosition += 8;
      });

      yPosition += 5;
    });

    yPosition += 10;
  });

  // Save
  pdf.save(
    `cap-training-schedule-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

export function exportManagerView(
  schedule: DaySchedule[],
  managerName: string
): void {
  const managerSchedule = schedule
    .map((day) => ({
      ...day,
      sessions: day.sessions.filter((session) =>
        session.agents.some((agent) => agent.manager === managerName)
      ),
    }))
    .filter((day) => day.sessions.length > 0);

  if (managerSchedule.length === 0) {
    alert(`No training sessions found for manager: ${managerName}`);
    return;
  }

  exportToPDF(managerSchedule);
}

export function exportEmailFormat(schedule: DaySchedule[]): string {
  let emailText = `CAP Training Schedule - Week of ${new Date().toLocaleDateString()}\n\n`;

  emailText += `Dear Team,\n\n`;
  emailText += `Please find below the training schedule for this week. All sessions are designed to improve CAP scores and should be treated as "coaching sessions" or "skill development" time.\n\n`;

  schedule.forEach((day) => {
    if (day.sessions.length > 0) {
      emailText += `${day.day}:\n`;

      day.sessions.forEach((session) => {
        emailText += `  ${session.time} - ${session.location} ${session.tier} Tier\n`;
        emailText += `    Priority: ${session.priority}\n`;
        emailText += `    Agents: ${session.agents
          .map((agent) => agent.name)
          .join(", ")}\n`;
        emailText += `    Managers: ${[
          ...new Set(session.agents.map((agent) => agent.manager)),
        ].join(", ")}\n\n`;
      });
    }
  });

  emailText += `Important Notes:\n`;
  emailText += `• Please coordinate with managers 48 hours before scheduled sessions\n`;
  emailText += `• Keep training discrete (refer to as "coaching")\n`;
  emailText += `• Track attendance and reschedule no-shows\n`;
  emailText += `• Each agent receives 1 hour/day training until CAP scores improve\n\n`;

  emailText += `Best regards,\nTraining Team`;

  return emailText;
}

export function copyEmailToClipboard(schedule: DaySchedule[]): void {
  const emailText = exportEmailFormat(schedule);
  navigator.clipboard
    .writeText(emailText)
    .then(() => {
      alert("Email format copied to clipboard!");
    })
    .catch(() => {
      alert("Failed to copy to clipboard. Please try again.");
    });
}
