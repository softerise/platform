import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FileDropzone,
  toast,
} from "@project/ui";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import { CSVPreviewTable } from "./components/csv-preview-table";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

interface ParsedInvite {
  email: string;
  role: string;
  message?: string;
  valid: boolean;
  error?: string;
}

const VALID_ROLES = ["EMPLOYEE", "TEAM_LEAD", "HR_MANAGER"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BulkImportPage() {
  const navigate = useNavigate();

  const [file, setFile] = React.useState<File | null>(null);
  const [parsedData, setParsedData] = React.useState<ParsedInvite[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{
    successful: number;
    failed: number;
    errors: Array<{ email: string; reason: string }>;
  } | null>(null);

  const parseCSV = (content: string): ParsedInvite[] => {
    const lines = content.trim().split("\n");
    const results: ParsedInvite[] = [];
    const startIndex = lines[0]?.toLowerCase().includes("email") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const [email, role, message] = values;

      const invite: ParsedInvite = {
        email: email || "",
        role: (role || "EMPLOYEE").toUpperCase(),
        message: message || undefined,
        valid: true,
      };

      if (!email || !EMAIL_REGEX.test(email)) {
        invite.valid = false;
        invite.error = "Invalid email address";
      } else if (role && !VALID_ROLES.includes(invite.role)) {
        invite.valid = false;
        invite.error = `Invalid role. Use: ${VALID_ROLES.join(", ")}`;
      } else if (
        results.some((r) => r.email.toLowerCase() === email.toLowerCase())
      ) {
        invite.valid = false;
        invite.error = "Duplicate email";
      }

      results.push(invite);
    }

    return results;
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setUploadResult(null);

    try {
      const content = await selectedFile.text();
      const parsed = parseCSV(content);
      setParsedData(parsed);
    } catch (error) {
      toast.error("Failed to parse CSV file");
      setFile(null);
      setParsedData([]);
    }
  };

  const handleRemoveRow = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setFile(null);
    setParsedData([]);
    setUploadResult(null);
  };

  const handleSubmit = async () => {
    const validInvites = parsedData.filter((d) => d.valid);

    if (validInvites.length === 0) {
      toast.error("No valid invitations to send");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/b2b/invites/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          invites: validInvites.map((d) => ({
            email: d.email,
            assignedRole: d.role,
            personalMessage: d.message,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send invitations");
      }

      const result = await response.json();
      setUploadResult(result);

      if (result.successful > 0) {
        toast.success(`${result.successful} invitation(s) sent successfully`);
      }
      if (result.failed > 0) {
        toast.error(`${result.failed} invitation(s) failed`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitations",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const template = `email,role,message
john@example.com,EMPLOYEE,Welcome to the team!
jane@example.com,TEAM_LEAD,
bob@example.com,HR_MANAGER,Looking forward to working with you`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invite-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter((d) => d.valid).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/company/invites")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Invitations
      </Button>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Bulk Import Invitations</CardTitle>
          <CardDescription>
            Upload a CSV file to invite multiple team members at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {uploadResult && (
            <Alert
              variant={uploadResult.failed > 0 ? "destructive" : "default"}
            >
              <AlertDescription>
                <div className="flex items-center gap-4">
                  {uploadResult.successful > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {uploadResult.successful} sent
                    </span>
                  )}
                  {uploadResult.failed > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {uploadResult.failed} failed
                    </span>
                  )}
                </div>
                {uploadResult.errors.length > 0 && (
                  <ul className="mt-2 text-sm">
                    {uploadResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>
                        {err.email}: {err.reason}
                      </li>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <li>
                        ...and {uploadResult.errors.length - 5} more
                      </li>
                    )}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">CSV Template</p>
              <p className="text-sm text-muted-foreground">
                Download our template with the correct format
              </p>
            </div>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {!file ? (
            <FileDropzone
              accept=".csv"
              maxSize={5 * 1024 * 1024}
              onFileSelect={handleFileSelect}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  Remove
                </Button>
              </div>

              {parsedData.length > 0 && (
                <CSVPreviewTable data={parsedData} onRemove={handleRemoveRow} />
              )}
            </div>
          )}

          {file && parsedData.length > 0 && (
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                onClick={handleSubmit}
                disabled={isUploading || validCount === 0}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Send {validCount} Invitation{validCount !== 1 ? "s" : ""}
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear & Start Over
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg">CSV Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1">Required Columns:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 rounded">email</code> — Valid
                  email address
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Optional Columns:</p>
              <ul className="list-disc list-inside text-muted-foreground">
                <li>
                  <code className="bg-muted px-1 rounded">role</code> —
                  EMPLOYEE (default), TEAM_LEAD, or HR_MANAGER
                </li>
                <li>
                  <code className="bg-muted px-1 rounded">message</code> —
                  Personal message (max 500 characters)
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Example:</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`email,role,message
john@example.com,EMPLOYEE,Welcome to the team!
jane@example.com,TEAM_LEAD,
bob@example.com,HR_MANAGER,Looking forward to working with you`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BulkImportPage;

