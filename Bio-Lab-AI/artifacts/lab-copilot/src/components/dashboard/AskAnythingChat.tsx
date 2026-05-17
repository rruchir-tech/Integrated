import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const SYSTEM_PROMPT = "You are an expert biotech and cell biology advisor. Answer general scientific questions, explain concepts, help with protocol design, and discuss biotech topics. Be concise and scientific.";

export function AskAnythingChat() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async () => {
    const content = message.trim();
    if (!content || isStreaming) return;

    setIsStreaming(true);
    setResponse("");

    try {
      const res = await fetch(`${BASE}/api/gemini/general-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, systemPrompt: SYSTEM_PROMPT }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.content) setResponse((prev) => prev + data.content);
          }
        }
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const isEmpty = !response && !isStreaming;

  return (
    <Card className="border-primary/20 dark:shadow-[0_0_24px_rgba(0,245,255,0.08)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Ask Anything</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">General biotech questions, not experiment specific</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about protocols, biology, or biotech concepts..."
          className="min-h-[88px] resize-none"
        />
        <div className="flex justify-end">
          <Button onClick={sendMessage} disabled={isStreaming || !message.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            Send
          </Button>
        </div>
        <div className="max-h-64 overflow-auto rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed">
          {isEmpty ? (
            <span className="text-muted-foreground">Your response will appear here.</span>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {response || ""}
                </ReactMarkdown>
              </div>
              {isStreaming && (
                <motion.span
                  className="inline-block w-2 h-4 bg-primary ml-1 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                />
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
