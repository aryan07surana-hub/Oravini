import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ClientLayout from "@/components/layout/ClientLayout";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, Plus, Trash2, Edit2, ArrowRight, Clock, Save, ArrowLeft, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AiRefineButton } from "@/components/ui/AiRefineButton";
import { useAuth } from "@/hooks/use-auth";

function StepCard({ step, index, onEdit, onDelete, isLast }: any) {
  return (
    <div className="relative">
      <div className="p-4 border border-card-border bg-card rounded-xl space-y-3 hover:border-primary/30 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{index + 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  {step.delayDays === 0 ? "Send Immediately" : `Wait ${step.delayDays} day${step.delayDays !== 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{step.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(step, index)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(step.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex justify-center py-2">
          <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
        </div>
      )}
    </div>
  );
}

function StepDialog({ open, onClose, existing, sequenceId, stepOrder }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    delayDays: existing?.delayDays ?? 0,
    message: existing?.message || "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        delayDays: existing.delayDays ?? 0,
        message: existing.message || "",
      });
    } else {
      setForm({ delayDays: 0, message: "" });
    }
  }, [existing, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/dm/sequences/${sequenceId}/steps`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dm/sequences/${sequenceId}/steps`] });
      toast({ title: "Step added!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/dm/sequences/${sequenceId}/steps/${existing?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dm/sequences/${sequenceId}/steps`] });
      toast({ title: "Step updated!" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submit = () => {
    if (!form.message.trim()) return toast({ title: "Message required", variant: "destructive" });
    
    const payload = {
      delayDays: parseInt(String(form.delayDays)) || 0,
      message: form.message.trim(),
      stepOrder: existing?.stepOrder ?? stepOrder,
    };
    
    if (existing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Step" : "Add Sequence Step"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground">Delay (Days)</Label>
            <Select value={String(form.delayDays)} onValueChange={v => setForm(f => ({ ...f, delayDays: parseInt(v) }))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Send Immediately</SelectItem>
                <SelectItem value="1">Wait 1 day</SelectItem>
                <SelectItem value="2">Wait 2 days</SelectItem>
                <SelectItem value="3">Wait 3 days</SelectItem>
                <SelectItem value="5">Wait 5 days</SelectItem>
                <SelectItem value="7">Wait 7 days</SelectItem>
                <SelectItem value="14">Wait 14 days</SelectItem>
                <SelectItem value="30">Wait 30 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              {form.delayDays === 0 ? "This message will be sent immediately" : `This message will be sent ${form.delayDays} day${form.delayDays !== 1 ? 's' : ''} after the previous step`}
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Message *</Label>
            <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Type your message here..." rows={6} className="mt-1 resize-none" />
            <p className="text-[10px] text-muted-foreground mt-1">{form.message.length} / 1000 characters</p>
            <AiRefineButton text={form.message} onAccept={v => setForm(f => ({ ...f, message: v }))} context="Instagram DM sequence step message" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : existing ? "Save Changes" : "Add Step"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SequenceBuilder({ useAdmin = false }: { useAdmin?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const Layout = useAdmin ? AdminLayout : ClientLayout;
  
  const [match, params] = useRoute("/dm-automation/sequences/:id");
  const sequenceId = params?.id;

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<any>(null);

  const { data: sequence, isLoading: sequenceLoading } = useQuery<any>({
    queryKey: [`/api/dm/sequences/${sequenceId}`],
    queryFn: () => fetch(`/api/dm/sequences/${sequenceId}`).then(r => r.json()),
    enabled: !!sequenceId,
  });

  const { data: steps = [], isLoading: stepsLoading } = useQuery<any[]>({
    queryKey: [`/api/dm/sequences/${sequenceId}/steps`],
    queryFn: () => fetch(`/api/dm/sequences/${sequenceId}/steps`).then(r => r.json()),
    enabled: !!sequenceId,
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => apiRequest("DELETE", `/api/dm/sequences/${sequenceId}/steps/${stepId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dm/sequences/${sequenceId}/steps`] });
      toast({ title: "Step deleted" });
    },
  });

  if (!match || !sequenceId) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Sequence not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dm-automation")} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{sequence?.name || "Sequence Builder"}</h1>
              <p className="text-xs text-muted-foreground">Build your multi-step DM campaign</p>
            </div>
          </div>
          <Button onClick={() => { setEditingStep(null); setStepDialogOpen(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Add Step
          </Button>
        </div>

        {sequence?.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{sequence.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Sequence Steps ({steps.length})</h2>
          </div>

          {stepsLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 rounded-full border-2 animate-spin mx-auto" style={{ borderColor: "#d4b461", borderTopColor: "transparent" }} />
            </div>
          ) : steps.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl">
              <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground mb-4">No steps yet. Add your first message!</p>
              <Button onClick={() => { setEditingStep(null); setStepDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" /> Add First Step
              </Button>
            </div>
          ) : (
            <div className="space-y-0">
              {steps.map((step, index) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={index}
                  isLast={index === steps.length - 1}
                  onEdit={(s: any, i: number) => { setEditingStep(s); setStepDialogOpen(true); }}
                  onDelete={(id: string) => { if (confirm("Delete this step?")) deleteStepMutation.mutate(id); }}
                />
              ))}
            </div>
          )}
        </div>

        <StepDialog
          open={stepDialogOpen}
          onClose={() => { setStepDialogOpen(false); setEditingStep(null); }}
          existing={editingStep}
          sequenceId={sequenceId}
          stepOrder={steps.length}
        />
      </div>
    </Layout>
  );
}
