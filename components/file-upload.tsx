"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  validateFileStructure,
  parseCAPFile,
  ParseResult,
} from "@/lib/file-parser";

interface FileUploadProps {
  onFileProcessed: (result: ParseResult) => void;
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setValidationError(null);

      try {
        // First validate file structure
        const validation = await validateFileStructure(file);
        if (!validation.valid) {
          setValidationError(validation.error || "Invalid file format");
          setIsProcessing(false);
          return;
        }

        // Parse the file
        const result = await parseCAPFile(file);
        onFileProcessed(result);
      } catch (error) {
        setValidationError(
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileProcessed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-8">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center space-y-4">
            {isProcessing ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isProcessing
                  ? "Processing File..."
                  : "Upload CAP Performance Report"}
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Drag and drop your CSV/TSV file here, or click to browse
              </p>
            </div>

            <input
              type="file"
              accept=".csv,.tsv"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />

            <Button asChild variant="outline" disabled={isProcessing}>
              <label htmlFor="file-upload" className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" />
                Choose File
              </label>
            </Button>

            {validationError && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{validationError}</span>
              </div>
            )}

            <div className="text-xs text-gray-400 space-y-1">
              <p>Expected format: Tab-separated values (TSV)</p>
              <p>
                Required columns: Tenure, Q, Site, MANAGER, WoW Delta, Prior
                Rank, Current Rank, Sales Agent, CAP Score
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
