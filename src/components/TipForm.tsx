import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Send, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TipFormProps {
  journalistId: string;
  journalistName: string;
  onClose: () => void;
}

export const TipForm = ({ journalistId, journalistName, onClose }: TipFormProps) => {
  const { language } = useTheme();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const labels = {
    title: language === "no" ? "Send et tips" : "Send a tip",
    subtitle: language === "no" 
      ? `Til ${journalistName} - helt anonymt og kryptert`
      : `To ${journalistName} - completely anonymous and encrypted`,
    tipLabel: language === "no" ? "Ditt tips" : "Your tip",
    tipPlaceholder: language === "no" 
      ? "Beskriv tipset ditt her. Inkluder så mye detaljer som mulig..."
      : "Describe your tip here. Include as many details as possible...",
    emailLabel: language === "no" ? "E-post for oppfølging (valgfritt)" : "Email for follow-up (optional)",
    emailPlaceholder: language === "no" 
      ? "din@epost.no (helt valgfritt)"
      : "your@email.com (completely optional)",
    securityNote: language === "no"
      ? "Tips sendes kryptert og kan ikke spores tilbake til deg."
      : "Tips are sent encrypted and cannot be traced back to you.",
    submit: language === "no" ? "Send tips" : "Send tip",
    sending: language === "no" ? "Sender..." : "Sending...",
    successTitle: language === "no" ? "Takk for tipset!" : "Thank you for your tip!",
    successMessage: language === "no"
      ? "Tipset ditt er mottatt og vil bli gjennomgått av journalisten."
      : "Your tip has been received and will be reviewed by the journalist.",
    close: language === "no" ? "Lukk" : "Close",
    errorTitle: language === "no" ? "Feil" : "Error",
    errorMessage: language === "no" 
      ? "Kunne ikke sende tipset. Prøv igjen."
      : "Could not send the tip. Please try again."
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("tips")
        .insert({
          journalist_id: journalistId,
          journalist_name: journalistName,
          content: content.trim(),
          follow_up_email: email.trim() || null,
          is_anonymous: true
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: labels.successTitle,
        description: labels.successMessage,
      });
    } catch (error) {
      console.error("Error submitting tip:", error);
      toast({
        title: labels.errorTitle,
        description: labels.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-2xl p-8 max-w-md w-full shadow-elevated text-center animate-scale-in">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="font-headline text-2xl font-semibold text-headline mb-2">
            {labels.successTitle}
          </h3>
          <p className="text-muted-foreground font-body mb-6">
            {labels.successMessage}
          </p>
          <Button onClick={onClose} className="w-full">
            {labels.close}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-lg w-full shadow-elevated animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-headline text-xl font-semibold text-headline">
                {labels.title}
              </h3>
              <p className="text-sm text-muted-foreground font-body">
                {labels.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tip-content" className="font-body font-medium">
              {labels.tipLabel}
            </Label>
            <Textarea
              id="tip-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={labels.tipPlaceholder}
              className="mt-1.5 min-h-[150px] font-body"
              required
            />
          </div>

          <div>
            <Label htmlFor="tip-email" className="font-body font-medium">
              {labels.emailLabel}
            </Label>
            <Input
              id="tip-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={labels.emailPlaceholder}
              className="mt-1.5 font-body"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground font-body">
              {labels.securityNote}
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? (
              labels.sending
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {labels.submit}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};
