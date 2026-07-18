import { Link } from "wouter";
import { ArrowLeft, Orbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabConversation, LabPageHeader } from "@/components/lab/LivingLab";

export default function NotFound() {
  return (
    <div className="lab-page space-y-7 pb-12" data-accent="rose">
      <LabPageHeader
        eyebrow="Unmapped coordinate · 404"
        title="This signal left the known system."
        description="The address does not point to a Bioalyzer workspace. Your experiments are safe; the route simply is not part of the current map."
        icon={Orbit}
        accent="rose"
        status="No record found"
        actions={
          <Link href="/dashboard">
            <Button className="gap-2"><ArrowLeft className="h-4 w-4" /> Return to command center</Button>
          </Link>
        }
      />
      <LabConversation label="Navigator" accent="rose">
        I could not resolve this coordinate. Use the command center to re-enter the workspace, then continue from the last visible experiment or project signal.
      </LabConversation>
    </div>
  );
}
