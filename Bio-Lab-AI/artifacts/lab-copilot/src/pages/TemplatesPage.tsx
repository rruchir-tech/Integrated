import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookTemplate, Pencil, Trash2, FlaskConical, Microscope, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LabConversation, LabPageHeader } from "@/components/lab/LivingLab";

interface Template {
  id: number;
  name: string;
  assay_type: string;
  instrument: string;
  description: string | null;
  default_notes: string | null;
  expected_control_rule: string | null;
  expected_status_default: string;
  ai_prompt_hint: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateForm {
  name: string;
  assay_type: string;
  instrument: string;
  description: string;
  default_notes: string;
  expected_control_rule: string;
  expected_status_default: string;
  ai_prompt_hint: string;
}

const EMPTY_FORM: TemplateForm = {
  name: "",
  assay_type: "",
  instrument: "Synergy H1",
  description: "",
  default_notes: "",
  expected_control_rule: "",
  expected_status_default: "in_progress",
  ai_prompt_hint: "",
};

const ASSAY_TYPES = [
  "ELISA", "Absorbance", "Fluorescence", "Luminescence",
  "Cell Viability", "Cytotoxicity", "Plate Reader", "qPCR",
  "Western Blot", "Flow Cytometry", "Other",
];

const INSTRUMENTS = [
  "Synergy H1", "Synergy Neo2", "Synergy HTX", "Gen5", "SpectraMax",
  "Varioskan", "Infinite 200 Pro", "Generic",
];

function fetchTemplates(): Promise<Template[]> {
  return apiFetch("/api/templates").then((r) => r.json());
}

export function TemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  const createMutation = useMutation({
    mutationFn: (data: TemplateForm) =>
      apiFetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template created", description: "Ready to use in new experiments." });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to create template.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: TemplateForm & { id: number }) =>
      apiFetch(`/api/templates/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template updated" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to update template.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      toast({ title: "Template deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      assay_type: t.assay_type,
      instrument: t.instrument,
      description: t.description ?? "",
      default_notes: t.default_notes ?? "",
      expected_control_rule: t.expected_control_rule ?? "",
      expected_status_default: t.expected_status_default,
      ai_prompt_hint: t.ai_prompt_hint ?? "",
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.assay_type.trim()) {
      toast({ title: "Required fields missing", description: "Name and assay type are required.", variant: "destructive" });
      return;
    }
    if (editing) {
      updateMutation.mutate({ ...form, id: editing.id });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="lab-page space-y-7 pb-12" data-accent="emerald">
      <LabPageHeader
        eyebrow="Protocol pattern library"
        title="Make rigor reusable."
        description="Capture the setup knowledge your lab repeats—instrument, assay, controls, context, and AI guidance—then begin every new record from a stronger baseline."
        icon={BookTemplate}
        accent="emerald"
        status={`${templates?.length ?? 0} reusable pattern${templates?.length === 1 ? "" : "s"}`}
        actions={
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
        }
      />

      <LabConversation accent="emerald">
        {templates?.length
          ? `Your lab has ${templates.length} starting pattern${templates.length === 1 ? "" : "s"}. I’ll carry their control expectations and analysis hints into every experiment that uses them.`
          : "Your protocol memory is empty. Capture one trusted starting pattern and I’ll help every future experiment begin with less retyping and more context."}
      </LabConversation>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lab-panel relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border-dashed px-6 py-24 text-center"
        >
          <BookTemplate className="h-16 w-16 text-primary/30 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No templates yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            Create a template to standardize your experiment setup and speed up data entry.
          </p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create your first template
          </Button>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {templates.map((t, idx) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="lab-panel group flex h-full flex-col rounded-[1.6rem] transition-all hover:-translate-y-1 hover:border-emerald-400/40 hover:shadow-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{t.name}</CardTitle>
                        {t.description && (
                          <CardDescription className="mt-1 text-xs line-clamp-2">
                            {t.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(t)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-mono text-xs flex items-center gap-1">
                        <FlaskConical className="h-3 w-3" />
                        {t.assay_type}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs flex items-center gap-1">
                        <Microscope className="h-3 w-3" />
                        {t.instrument}
                      </Badge>
                    </div>
                    {t.expected_control_rule && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 font-mono">
                        Control: {t.expected_control_rule}
                      </div>
                    )}
                    {t.ai_prompt_hint && (
                      <div className="text-xs text-primary/70 bg-primary/5 border border-primary/10 rounded px-2 py-1.5">
                        AI hint: {t.ai_prompt_hint}
                      </div>
                    )}
                    {t.default_notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        "{t.default_notes}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Standard ELISA Protocol"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Assay Type <span className="text-destructive">*</span></Label>
                <Select
                  value={form.assay_type}
                  onValueChange={(v) => setForm({ ...form, assay_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSAY_TYPES.map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Instrument</Label>
                <Select
                  value={form.instrument}
                  onValueChange={(v) => setForm({ ...form, instrument: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Brief description of when to use this template…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Default Notes</Label>
              <Textarea
                placeholder="Notes pre-filled for new experiments (protocol steps, reagents, etc.)…"
                value={form.default_notes}
                onChange={(e) => setForm({ ...form, default_notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Control Rule</Label>
              <Input
                placeholder="e.g., CV% < 10%, blank wells A1–A3"
                value={form.expected_control_rule}
                onChange={(e) => setForm({ ...form, expected_control_rule: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>AI Hint</Label>
              <Input
                placeholder="Extra context for AI analysis of this assay type…"
                value={form.ai_prompt_hint}
                onChange={(e) => setForm({ ...form, ai_prompt_hint: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" will be permanently removed. Experiments created from it are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
