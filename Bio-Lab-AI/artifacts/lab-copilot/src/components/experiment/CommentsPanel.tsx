import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useUser } from "@clerk/react";

interface Comment {
  id: number;
  experiment_id: number;
  comment_type: string;
  target_reference: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

interface CommentsPanelProps {
  experimentId: number;
}

function fetchComments(expId: number): Promise<Comment[]> {
  return apiFetch(`/api/experiments/${expId}/comments`).then((r) => r.json());
}

const COMMENT_TYPES = [
  { value: "general", label: "General" },
  { value: "data_quality", label: "Data Quality" },
  { value: "protocol", label: "Protocol" },
  { value: "result", label: "Result" },
];

export function CommentsPanel({ experimentId }: CommentsPanelProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const defaultName = user?.firstName || user?.username || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "";

  const [authorName, setAuthorName] = useState(defaultName);
  const [content, setContent] = useState("");
  const [commentType, setCommentType] = useState("general");

  const { data: comments, isLoading } = useQuery<Comment[]>({
    queryKey: ["comments", experimentId],
    queryFn: () => fetchComments(experimentId),
  });

  const addMutation = useMutation({
    mutationFn: (data: { author_name: string; content: string; comment_type: string }) =>
      apiFetch(`/api/experiments/${experimentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", experimentId] });
      setContent("");
    },
    onError: () => toast({ title: "Error", description: "Failed to add comment.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/comments/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", experimentId] }),
    onError: () => toast({ title: "Error", description: "Failed to delete comment.", variant: "destructive" }),
  });

  function handleSubmit() {
    if (!content.trim() || !authorName.trim()) {
      toast({ title: "Author name and comment are required.", variant: "destructive" });
      return;
    }
    addMutation.mutate({ author_name: authorName, content: content.trim(), comment_type: commentType });
  }

  const typeColor: Record<string, string> = {
    general: "outline",
    data_quality: "secondary",
    protocol: "secondary",
    result: "default",
  };

  return (
    <Card className="hover:border-l-2 hover:border-l-primary transition-all dark:hover:shadow-[0_0_20px_rgba(0,245,255,0.08)]">
      <CardHeader className="py-4 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Comments
          {comments && comments.length > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">{comments.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : !comments || comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm font-mono">
            No comments yet. Be the first to add one.
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            <AnimatePresence>
              {[...comments].reverse().map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border rounded-lg p-3 bg-muted/30 group relative"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary uppercase">
                      {c.author_name[0]}
                    </div>
                    <span className="text-sm font-medium">{c.author_name}</span>
                    <Badge
                      variant={typeColor[c.comment_type] as "outline" | "secondary" | "default" ?? "outline"}
                      className="text-[10px] px-1.5 py-0 capitalize"
                    >
                      {c.comment_type.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(parseISO(c.created_at), { addSuffix: true })}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive ml-1"
                      onClick={() => deleteMutation.mutate(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed pl-8">{c.content}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Your name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-1 flex-wrap">
              {COMMENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setCommentType(t.value)}
                  className={`text-[10px] px-2 py-1 rounded border font-medium transition-colors ${
                    commentType === t.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="flex-1 text-sm resize-none"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
              }}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={addMutation.isPending || !content.trim() || !authorName.trim()}
              className="self-end flex-shrink-0"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">⌘+Enter to submit</p>
        </div>
      </CardContent>
    </Card>
  );
}
