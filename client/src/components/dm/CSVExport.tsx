import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

export function CSVExportButton({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const response = await fetch("/api/dm/leads/export", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ 
        title: "Export successful!", 
        description: "Your leads have been exported to CSV" 
      });
    } catch (error: any) {
      toast({ 
        title: "Export failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export CSV
        </>
      )}
    </Button>
  );
}

export function CSVExportCard({ clientId, leadCount }: { clientId: string; leadCount: number }) {
  return (
    <div className="p-4 rounded-xl border border-card-border bg-card hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Export Leads</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Download all {leadCount} leads as CSV
            </p>
            <p className="text-[10px] text-muted-foreground">
              Includes: name, handle, status, tags, notes, dates, custom fields
            </p>
          </div>
        </div>
        <CSVExportButton clientId={clientId} />
      </div>
    </div>
  );
}
