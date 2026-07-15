import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, Loader2, FlaskConical } from "lucide-react";

/**
 * Upload plate data to an experiment that was created design-first (from a goal /
 * protocol, before any data existed). Posts to POST /api/experiments/:id/data,
 * which re-parses the file and clears stale AI analysis. On success the parent
 * refetches; the detail page's auto-analyze then quantifies the new data.
 */
export function AttachDataCard({
  experimentId,
  onAttached,
}: {
  experimentId: number;
  onAttached: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    const lower = file.name.toLowerCase();
    // Legacy .xls can't be read server-side — steer the user to re-export.
    if (lower.endsWith(".xls") && !lower.endsWith(".xlsx")) {
      toast({
        title: "Legacy .xls not supported",
        description: "Re-export/Save As .xlsx from Gen5 or Excel, then upload that.",
        variant: "destructive",
      });
      return;
    }
    if (!/\.(xlsx|csv|tsv|txt)$/.test(lower)) {
      toast({
        title: "Unsupported file type",
        description: "Upload a Gen5 / Synergy H1 .xlsx, or a CSV/TSV/TXT table.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await apiFetch(`/api/experiments/${experimentId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_content_b64: b64, file_name: file.name }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      toast({ title: "Data attached", description: "Quantifying the plate now…" });
      onAttached();
    } catch (err) {
      toast({
        title: "Couldn't attach data",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          Add plate data
        </CardTitle>
        <CardDescription>
          This experiment has no results yet. Upload the plate-reader output to quantify it and get an AI analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label
          className={`block border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center transition-colors ${
            busy ? "opacity-60 pointer-events-none" : "cursor-pointer"
          } ${dragging ? "border-primary bg-primary/10" : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
        >
          {busy ? (
            <Loader2 className="h-8 w-8 text-primary mb-3 animate-spin" />
          ) : (
            <UploadCloud className={`h-8 w-8 text-primary mb-3 transition-transform ${dragging ? "scale-125" : ""}`} />
          )}
          <div className="text-sm font-medium text-foreground mb-1">
            {busy ? "Parsing plate data…" : dragging ? "Release to upload" : "Drop a Gen5 / Synergy H1 export here"}
          </div>
          <div className="text-xs text-muted-foreground mb-4">.xlsx, or CSV / TSV / TXT</div>
          <input
            type="file"
            accept=".xlsx,.csv,.tsv,.txt"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button type="button" variant="outline" size="sm" asChild disabled={busy}>
            <span>Browse file</span>
          </Button>
        </label>
      </CardContent>
    </Card>
  );
}
