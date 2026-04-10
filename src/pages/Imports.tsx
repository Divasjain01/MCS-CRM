import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/context/AuthContext";
import { useImportLeadsMutation, useLeadsQuery } from "@/hooks/use-leads";
import { useUsersQuery } from "@/hooks/use-users";
import { parseCsv, rowsToObjects } from "@/lib/csv";
import {
  buildLeadImportPreview,
  getMissingRequiredMappings,
  leadImportFields,
  suggestImportMappings,
} from "@/lib/lead-import";
import { cn } from "@/lib/utils";
import type { Lead, LeadImportField, UserSummary } from "@/types/crm";

type ImportStep = "upload" | "map" | "preview" | "complete";

const EMPTY_USERS: UserSummary[] = [];
const EMPTY_LEADS: Lead[] = [];

export default function ImportsPage() {
  const { authUser } = useAuth();
  const usersQuery = useUsersQuery();
  const users = usersQuery.data ?? EMPTY_USERS;
  const leadsQuery = useLeadsQuery(users);
  const importLeadsMutation = useImportLeadsMutation();

  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, LeadImportField | "skip">>({});
  const [importResult, setImportResult] = useState<{ insertedCount: number; skippedCount: number } | null>(null);

  const steps = [
    { id: "upload", label: "Upload", description: "Select CSV file" },
    { id: "map", label: "Map Fields", description: "Match columns" },
    { id: "preview", label: "Preview", description: "Review data" },
    { id: "complete", label: "Complete", description: "Import done" },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const headers = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  const preview = useMemo(
    () =>
      buildLeadImportPreview({
        rows: parsedRows,
        mappings: fieldMappings,
        existingLeads: leadsQuery.data ?? EMPTY_LEADS,
        users,
      }),
    [fieldMappings, leadsQuery.data, parsedRows, users],
  );

  const missingRequiredMappings = useMemo(
    () => getMissingRequiredMappings(fieldMappings),
    [fieldMappings],
  );

  const resetImportFlow = () => {
    setCurrentStep("upload");
    setFile(null);
    setParsedRows([]);
    setFieldMappings({});
    setImportResult(null);
  };

  const handleFile = async (nextFile: File | null) => {
    if (!nextFile) {
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      toast("Unsupported file", {
        description: "Please upload a CSV file.",
      });
      return;
    }

    try {
      const content = await nextFile.text();
      const rows = rowsToObjects(parseCsv(content));

      if (rows.length === 0) {
        toast("Empty file", {
          description: "The CSV does not contain any rows to import.",
        });
        return;
      }

      setFile(nextFile);
      setParsedRows(rows);
      setFieldMappings(suggestImportMappings(Object.keys(rows[0])));
      setImportResult(null);
    } catch (error) {
      toast("Unable to parse CSV", {
        description: error instanceof Error ? error.message : "Please review the file and try again.",
      });
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files[0] ?? null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0] ?? null);
  };

  const handleGoToPreview = () => {
    if (missingRequiredMappings.length > 0) {
      toast("Required mappings missing", {
        description: "Map Full Name and Phone before continuing.",
      });
      return;
    }

    setCurrentStep("preview");
  };

  const handleImport = async () => {
    if (preview.readyRows.length === 0) {
      toast("No valid rows to import", {
        description: "Resolve invalid or duplicate rows before importing.",
      });
      return;
    }

    try {
      const result = await importLeadsMutation.mutateAsync({
        payloads: preview.readyRows,
        actorId: authUser?.id ?? null,
      });

      setImportResult(result);
      setCurrentStep("complete");
      toast("Import complete", {
        description: `${result.insertedCount} lead${result.insertedCount === 1 ? "" : "s"} imported successfully.`,
      });
    } catch (error) {
      toast("Import failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">Import Leads</h1>
        <p className="text-muted-foreground">
          Upload a CSV, validate the rows, and insert only clean lead records.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    index <= currentStepIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      index <= currentStepIndex ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-4 h-0.5 w-24",
                    index < currentStepIndex ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {currentStep === "upload" && (
            <div className="space-y-6">
              <div
                className={cn(
                  "rounded-xl border-2 border-dashed p-12 text-center transition-colors",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  file && "border-success bg-success/5",
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3">
                      <FileSpreadsheet className="h-12 w-12 text-success" />
                    </div>
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsedRows.length} row{parsedRows.length === 1 ? "" : "s"} detected
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetImportFlow}>
                      <X className="mr-2 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="text-lg font-medium">Drag and drop your CSV file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                    </div>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileSelect}
                    />
                    <Button variant="outline" asChild>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Browse Files
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                Expected minimum columns: <span className="font-medium text-foreground">Full Name</span> and{" "}
                <span className="font-medium text-foreground">Phone</span>. Additional fields can be mapped during
                the next step.
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setCurrentStep("map")} disabled={!file}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === "map" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-medium">Map CSV Columns to CRM Fields</h3>
                <p className="text-sm text-muted-foreground">
                  We suggested the closest matches. Adjust any column before validating the import.
                </p>
              </div>

              <div className="space-y-4">
                {headers.map((header) => (
                  <div key={header} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
                    <div className="sm:w-1/3">
                      <p className="text-sm font-medium">{header}</p>
                      <p className="text-xs text-muted-foreground">CSV column</p>
                    </div>
                    <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
                    <div className="flex-1">
                      <Select
                        value={fieldMappings[header] ?? "skip"}
                        onValueChange={(value) =>
                          setFieldMappings((previous) => ({
                            ...previous,
                            [header]: value as LeadImportField | "skip",
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select CRM field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip this column</SelectItem>
                          {leadImportFields.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                              {field.required ? " *" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {missingRequiredMappings.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/5 p-4 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>Required mappings are missing for Full Name and/or Phone.</p>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("upload")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={handleGoToPreview}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === "preview" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-lg font-medium">Preview Import Data</h3>
                <p className="text-sm text-muted-foreground">
                  Review validation results before inserting rows into Supabase.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Rows in file</p>
                  <p className="mt-2 text-2xl font-semibold">{preview.summary.totalRows}</p>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <p className="text-sm text-muted-foreground">Ready to import</p>
                  <p className="mt-2 text-2xl font-semibold text-success">{preview.summary.readyRows}</p>
                </div>
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                  <p className="text-sm text-muted-foreground">Duplicates</p>
                  <p className="mt-2 text-2xl font-semibold text-warning">{preview.summary.duplicateRows}</p>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-muted-foreground">Invalid</p>
                  <p className="mt-2 text-2xl font-semibold text-destructive">{preview.summary.invalidRows}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Status</th>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Source</th>
                        <th>Stage</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.previewRows.slice(0, 10).map((row) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>
                            <Badge
                              variant={
                                row.status === "ready"
                                  ? "default"
                                  : row.status === "duplicate"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td>{row.lead.fullName || "-"}</td>
                          <td>{row.lead.phone || "-"}</td>
                          <td>{row.lead.source ?? "-"}</td>
                          <td>{row.lead.stage ?? "-"}</td>
                          <td className="max-w-[280px]">
                            {row.errors.length > 0 ? (
                              <p className="text-sm text-destructive">{row.errors.join(" ")}</p>
                            ) : row.duplicateReason ? (
                              <p className="text-sm text-warning">{row.duplicateReason}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">Ready</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {preview.previewRows.length > 10 && (
                <p className="text-sm text-muted-foreground">
                  Showing 10 of {preview.previewRows.length} rows. Import validation applies to the full file.
                </p>
              )}

              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <p className="text-sm">
                  Duplicate rows are skipped before insert. Validation currently checks required fields plus duplicate
                  phone and email values.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep("map")}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => void handleImport()} disabled={importLeadsMutation.isPending}>
                  {importLeadsMutation.isPending ? "Importing..." : "Import Leads"}
                </Button>
              </div>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="space-y-6 py-8 text-center">
              <div className="flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-10 w-10 text-success" />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Import Complete</h3>
                <p className="text-muted-foreground">
                  Successfully imported {importResult?.insertedCount ?? 0} lead
                  {(importResult?.insertedCount ?? 0) === 1 ? "" : "s"}.
                </p>
                {(importResult?.skippedCount ?? 0) > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {importResult?.skippedCount ?? 0} row
                    {(importResult?.skippedCount ?? 0) === 1 ? "" : "s"} were skipped.
                  </p>
                )}
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={resetImportFlow}>
                  Import More
                </Button>
                <Button asChild>
                  <Link to="/leads">View Leads</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
