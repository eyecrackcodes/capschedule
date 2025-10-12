"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrainingSession, TRAINING_FOCUS } from "@/types";
import { Loader2, Sparkles, Download, Copy, AlertCircle } from "lucide-react";

interface CurriculumGeneratorProps {
  session: TrainingSession;
  day: string;
}

export function CurriculumGenerator({
  session,
  day,
}: CurriculumGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [curriculum, setCurriculum] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const trainingFocus = TRAINING_FOCUS[day as keyof typeof TRAINING_FOCUS];

  const generateCurriculum = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-curriculum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trainingType: trainingFocus,
          agents: session.agents,
          day: day,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate curriculum");
      }

      setCurriculum(data.curriculum);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCurriculum = () => {
    if (curriculum) {
      navigator.clipboard.writeText(curriculum);
      // You could add a toast notification here
    }
  };

  const downloadCurriculum = () => {
    if (curriculum) {
      const blob = new Blob([curriculum], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${day}_${session.location}_${session.time.replace(
        /[:\s]/g,
        "-"
      )}_curriculum.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="mt-4 border-2 border-dashed border-purple-200 bg-purple-50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Curriculum Generator
            <Badge variant="secondary" className="text-xs">
              Optional
            </Badge>
          </div>
          {!curriculum && (
            <Button
              size="sm"
              onClick={generateCurriculum}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate Curriculum
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      {(curriculum || error) && (
        <CardContent>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold">Error generating curriculum</p>
                <div className="text-xs mt-1 whitespace-pre-line">{error}</div>
              </div>
            </div>
          )}

          {curriculum && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-600">
                  Customized curriculum for {trainingFocus}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyCurriculum}
                    className="h-7 text-xs"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadCurriculum}
                    className="h-7 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-7 text-xs"
                  >
                    {isExpanded ? "Collapse" : "Expand"}
                  </Button>
                </div>
              </div>

              <div
                className={`bg-white p-4 rounded-lg border border-purple-200 ${
                  isExpanded ? "" : "max-h-40 overflow-hidden relative"
                }`}
              >
                <pre className="whitespace-pre-wrap text-xs font-mono text-gray-700">
                  {curriculum}
                </pre>
                {!isExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent" />
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurriculum(null);
                    setIsExpanded(false);
                  }}
                  className="text-xs"
                >
                  Generate New
                </Button>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
