import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Trash2, Type, Hash, Calendar as CalendarIcon, ToggleLeft } from "lucide-react";

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: CalendarIcon },
  { value: "boolean", label: "Yes/No", icon: ToggleLeft },
];

export function CustomFieldsManager({ clientId }: { clientId: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: fieldDefs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/dm/custom-field-defs", clientId],
    queryFn: () => fetch("/api/dm/custom-field-defs").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/dm/custom-field-defs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/custom-field-defs"] });
      toast({ title: "Field deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Custom Fields
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Add custom data fields to your leads</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 h-9">
          <Plus className="w-4 h-4" />
          Add Field
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : fieldDefs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Database className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground mb-1">No custom fields yet</p>
          <p className="text-xs text-muted-foreground">Create fields to track additional lead data</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fieldDefs.map((field: any) => {
            const FieldIcon = FIELD_TYPES.find(t => t.value === field.fieldType)?.icon || Type;
            return (
              <div key={field.id} className="p-4 rounded-xl border border-card-border bg-card hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FieldIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{field.label}</h4>
                      <p className="text-xs text-muted-foreground">
                        Type: {FIELD_TYPES.find(t => t.value === field.fieldType)?.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        {field.fieldKey}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { if (confirm("Delete this field? All data will be lost.")) deleteMutation.mutate(field.id); }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateFieldDialog open={dialogOpen} onClose={() => setDialogOpen(false)} clientId={clientId} />
    </div>
  );
}

function CreateFieldDialog({ open, onClose, clientId }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    label: "",
    fieldType: "text",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/dm/custom-field-defs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/custom-field-defs"] });
      toast({ title: "Field created!" });
      setForm({ label: "", fieldType: "text" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.label.trim()) {
      return toast({ title: "Label required", variant: "destructive" });
    }
    createMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Create Custom Field
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Field Label *</Label>
            <Input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Company Name, Budget, Industry"
              className="mt-1.5"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              The display name for this field
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Field Type *</Label>
            <Select value={form.fieldType} onValueChange={v => setForm(f => ({ ...f, fieldType: v }))}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-primary font-medium mb-1">Examples:</p>
            <ul className="text-[10px] text-muted-foreground space-y-1 list-disc list-inside">
              <li>Company Name (text)</li>
              <li>Budget (number)</li>
              <li>Meeting Date (date)</li>
              <li>Qualified (yes/no)</li>
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={createMutation.isPending} className="gap-2">
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? "Creating..." : "Create Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomFieldsEditor({ leadId, clientId }: { leadId: string; clientId: string }) {
  const { toast } = useToast();

  const { data: fieldDefs = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/custom-field-defs", clientId],
    queryFn: () => fetch("/api/dm/custom-field-defs").then(r => r.json()),
  });

  const { data: fieldValues = [] } = useQuery<any[]>({
    queryKey: ["/api/dm/leads", leadId, "fields"],
    queryFn: () => fetch(`/api/dm/leads/${leadId}/fields`).then(r => r.json()),
    enabled: !!leadId,
  });

  const [values, setValues] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/api/dm/leads/${leadId}/fields`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dm/leads", leadId, "fields"] });
      toast({ title: "Custom fields saved!" });
    },
  });

  const handleSave = () => {
    const fields = Object.entries(values).map(([fieldDefId, value]) => ({ fieldDefId, value }));
    saveMutation.mutate(fields);
  };

  if (fieldDefs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <p className="text-xs font-semibold text-foreground">Custom Fields</p>
      </div>
      <div className="space-y-2">
        {fieldDefs.map((field: any) => {
          const existingValue = fieldValues.find((v: any) => v.fieldDefId === field.id);
          const currentValue = values[field.id] ?? existingValue?.value ?? "";

          return (
            <div key={field.id}>
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.fieldType === "text" && (
                <Input
                  value={currentValue}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                  className="mt-1"
                />
              )}
              {field.fieldType === "number" && (
                <Input
                  type="number"
                  value={currentValue}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                  className="mt-1"
                />
              )}
              {field.fieldType === "date" && (
                <Input
                  type="date"
                  value={currentValue}
                  onChange={e => setValues(v => ({ ...v, [field.id]: e.target.value }))}
                  className="mt-1"
                />
              )}
              {field.fieldType === "boolean" && (
                <Select
                  value={currentValue}
                  onValueChange={v => setValues(vals => ({ ...vals, [field.id]: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
      {Object.keys(values).length > 0 && (
        <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm" className="w-full">
          {saveMutation.isPending ? "Saving..." : "Save Custom Fields"}
        </Button>
      )}
    </div>
  );
}
