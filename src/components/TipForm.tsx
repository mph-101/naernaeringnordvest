import { useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Send, CheckCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Validation constants
const MAX_CONTENT_LENGTH = 10000;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

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
  const [contentError, setContentError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const labels = {
    title: language === "no" ? "Send et tips" : "Send a tip",
    subtitle: language === "no"
      ? `Til ${journalistName} - via sikker forbindelse`
      : `To ${journalistName} - via secure connection`,
    tipLabel: language === "no" ? "Ditt tips" : "Your tip",
    tipPlaceholder: language === "no" 
      ? "Beskriv tipset ditt her. Inkluder så mye detaljer som mulig..."
      : "Describe your tip here. Include as many details as possible...",
    emailLabel: language === "no" ? "E-post for oppfølging (valgfritt)" : "Email for follow-up (optional)",
    emailPlaceholder: language === "no" 
      ? "din@epost.no (helt valgfritt)"
      : "your@email.com (completely optional)",
    securityNote: language === "no"
      ? "Tipset sendes over en sikker forbindelse (transportkryptering). For sensitive saker hvor full kildebeskyttelse er kritisk, kontakt redaksjonen via Signal: [Signal-nummer kommer] eller avtal et fysisk møte med en journalist."
      : "Your tip is sent over a secure connection (transport encryption). For sensitive matters where full source protection is critical, contact the newsroom via Signal: [Signal number TBD] or arrange a physical meeting with a journalist.",
    privacyNote: language === "no"
      ? "Vi logger ikke IP-adressen din direkte, men infrastruktur-leverandører kan logge tilkoblingsdata. E-post for oppfølging lagres i klartekst. Dette er ikke ende-til-ende-kryptert."
      : "We do not log your IP address directly, but infrastructure providers may log connection data. Follow-up email is stored in plaintext. This is not end-to-end encrypted.",
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
      : "Could not send the tip. Please try again.",
    rateLimitError: language === "no"
      ? "For mange tips sendt. Vennligst vent litt før du prøver igjen."
      : "Too many tips submitted. Please wait before trying again.",
    contentTooLong: language === "no"
      ? `Innholdet kan ikke være mer enn ${MAX_CONTENT_LENGTH} tegn.`
      : `Content cannot exceed ${MAX_CONTENT_LENGTH} characters.`,
    invalidEmail: language === "no"
      ? "Ugyldig e-postadresse."
      : "Invalid email address.",
  };

  // Client-side validation
  const validateForm = (): boolean => {
    let valid = true;
    setContentError(null);
    setEmailError(null);

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      setContentError(language === "no" ? "Innhold er påkrevd." : "Content is required.");
      valid = false;
    } else if (trimmedContent.length > MAX_CONTENT_LENGTH) {
      setContentError(labels.contentTooLong);
      valid = false;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length > 0 && !EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError(labels.invalidEmail);
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Use Edge Function for rate-limited, validated submission
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-tip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(session?.access_token && { "Authorization": `Bearer ${session.access_token}` }),
          },
          body: JSON.stringify({
            journalist_id: journalistId,
            journalist_name: journalistName,
            content: content.trim(),
            follow_up_email: email.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("RATE_LIMIT");
        }
        throw new Error(result.error || "Failed to submit tip");
      }

      setIsSubmitted(true);
      toast({
        title: labels.successTitle,
        description: labels.successMessage,
      });
    } catch (error) {
      const errorMessage = error instanceof Error && error.message === "RATE_LIMIT"
        ? labels.rateLimitError
        : labels.errorMessage;
      
      toast({
        title: labels.errorTitle,
        description: errorMessage,
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
              <span className="ml-2 text-xs text-muted-foreground">
                ({content.length}/{MAX_CONTENT_LENGTH})
              </span>
            </Label>
            <Textarea
              id="tip-content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setContentError(null);
              }}
              placeholder={labels.tipPlaceholder}
              className={`mt-1.5 min-h-[150px] font-body ${contentError ? 'border-destructive' : ''}`}
              required
              maxLength={MAX_CONTENT_LENGTH}
            />
            {contentError && (
              <p className="mt-1 text-xs text-destructive">{contentError}</p>
            )}
          </div>

          <div>
            <Label htmlFor="tip-email" className="font-body font-medium">
              {labels.emailLabel}
            </Label>
            <Input
              id="tip-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(null);
              }}
              placeholder={labels.emailPlaceholder}
              className={`mt-1.5 font-body ${emailError ? 'border-destructive' : ''}`}
            />
            {emailError && (
              <p className="mt-1 text-xs text-destructive">{emailError}</p>
            )}
          </div>

          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground font-body">
                {labels.securityNote}
              </p>
            </div>
            <p className="text-xs text-muted-foreground/70 font-body pl-6">
              {labels.privacyNote}
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
