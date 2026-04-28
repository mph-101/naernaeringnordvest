import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Check, Building2, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { JobPremiumCheckout } from "@/components/JobPremiumCheckout";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYMENT_TYPES, PREMIUM_PRICE_NOK } from "@/lib/jobs";
import { toast } from "sonner";

type Region = { slug: string; name: string };

export default function StillingNy() {
  const navigate = useNavigate();
  const { language } = useTheme();
  const { isAuthenticated, userId, user } = useAuth();
  const isNo = language === "no";

  const [regions, setRegions] = useState<Region[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [premiumChoice, setPremiumChoice] = useState<"none" | "stripe" | "invoice">("none");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  const [form, setForm] = useState({
    title: "",
    company_name: "",
    company_orgnr: "",
    location: "",
    region_slug: "",
    employment_type: "fulltime",
    industry: "",
    salary_range: "",
    application_deadline: "",
    description_html: "",
    application_url: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    additional_regions: [] as string[],
  });

  const [invoice, setInvoice] = useState({ invoice_email: "", invoice_reference: "", notes: "" });

  useEffect(() => {
    document.title = isNo ? "Legg ut stilling | Nær Næring" : "Post a job | Nær Næring";
    supabase
      .from("editorial_regions")
      .select("slug, name")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setRegions(data as Region[]);
      });
  }, [isNo]);

  const isPremium = premiumChoice !== "none";
  const totalNok = isPremium ? PREMIUM_PRICE_NOK : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login?redirect=/stillinger/ny");
      return;
    }
    if (!form.title || !form.company_name || !form.location || !form.description_html) {
      toast.error(isNo ? "Fyll inn tittel, bedrift, sted og beskrivelse" : "Please fill required fields");
      return;
    }
    setSubmitting(true);
    const insertPayload = {
      title: form.title,
      company_name: form.company_name,
      company_orgnr: form.company_orgnr || null,
      location: form.location,
      region_slug: form.region_slug || null,
      employment_type: form.employment_type,
      industry: form.industry || null,
      salary_range: form.salary_range || null,
      application_deadline: form.application_deadline || null,
      description_html: form.description_html,
      application_url: form.application_url || null,
      contact_name: form.contact_name || user?.email || null,
      contact_email: form.contact_email || user?.email || null,
      contact_phone: form.contact_phone || null,
      additional_regions: isPremium ? form.additional_regions : [],
      submitted_by: userId,
      status: "pending",
      premium_payment_method: premiumChoice === "none" ? null : premiumChoice,
    } as const;

    const { data, error } = await supabase
      .from("job_listings")
      .insert(insertPayload as any)
      .select("id")
      .single();

    setSubmitting(false);
    if (error || !data) {
      toast.error(error?.message || (isNo ? "Noe gikk galt" : "Something went wrong"));
      return;
    }
    setCreatedJobId(data.id);
    if (premiumChoice === "stripe") setShowCheckout(true);
    else if (premiumChoice === "invoice") setShowInvoiceForm(true);
    else {
      toast.success(isNo ? "Innsendt – venter på godkjenning" : "Submitted — awaiting review");
      setTimeout(() => navigate("/stillinger"), 1200);
    }
  };

  const submitInvoiceRequest = async () => {
    if (!createdJobId || !userId) return;
    if (!invoice.invoice_email) {
      toast.error(isNo ? "Faktura-epost er påkrevd" : "Invoice email required");
      return;
    }
    const { error } = await supabase.from("job_invoice_requests").insert({
      job_listing_id: createdJobId,
      requested_by: userId,
      company_name: form.company_name,
      orgnr: form.company_orgnr || null,
      invoice_email: invoice.invoice_email,
      invoice_reference: invoice.invoice_reference || null,
      notes: invoice.notes || null,
      amount_nok: PREMIUM_PRICE_NOK,
    } as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isNo ? "Faktura-forespørsel sendt" : "Invoice request submitted");
    navigate("/stillinger");
  };

  if (showCheckout && createdJobId) {
    return (
      <div className="min-h-screen bg-background">
        <PaymentTestModeBanner />
        <Header showSearch={false} />
        <main className="max-w-2xl mx-auto px-6 py-8">
          <h1 className="font-headline text-2xl font-bold text-headline mb-2">
            {isNo ? "Betal Premium-pakken" : "Pay for Premium"}
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-6">
            {PREMIUM_PRICE_NOK} kr · {isNo ? "engangsbetaling per stilling" : "one-time per posting"}
          </p>
          <JobPremiumCheckout
            jobListingId={createdJobId}
            returnUrl={`${window.location.origin}/stillinger/ny/takk?job_id=${createdJobId}&session_id={CHECKOUT_SESSION_ID}`}
          />
        </main>
      </div>
    );
  }

  if (showInvoiceForm && createdJobId) {
    return (
      <div className="min-h-screen bg-background">
        <Header showSearch={false} />
        <main className="max-w-xl mx-auto px-6 py-12">
          <h1 className="font-headline text-2xl font-bold text-headline mb-2">
            {isNo ? "Faktura-detaljer" : "Invoice details"}
          </h1>
          <p className="text-sm text-muted-foreground font-body mb-6">
            {isNo
              ? `Vi sender faktura på ${PREMIUM_PRICE_NOK} kr når annonsen er publisert.`
              : `We will invoice ${PREMIUM_PRICE_NOK} NOK after the listing is published.`}
          </p>
          <div className="space-y-4">
            <Field label={isNo ? "Faktura-epost (EHF/PDF)" : "Invoice email"} required>
              <input className="input" value={invoice.invoice_email} onChange={(e) => setInvoice({ ...invoice, invoice_email: e.target.value })} />
            </Field>
            <Field label={isNo ? "Bestillingsreferanse (valgfritt)" : "Reference (optional)"}>
              <input className="input" value={invoice.invoice_reference} onChange={(e) => setInvoice({ ...invoice, invoice_reference: e.target.value })} />
            </Field>
            <Field label={isNo ? "Notater" : "Notes"}>
              <textarea className="input min-h-[80px]" value={invoice.notes} onChange={(e) => setInvoice({ ...invoice, notes: e.target.value })} />
            </Field>
            <button
              onClick={submitInvoiceRequest}
              className="bg-primary text-primary-foreground rounded-full px-6 py-3 font-body font-medium"
            >
              {isNo ? "Send forespørsel" : "Send request"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-2xl mx-auto px-6 py-8 md:py-12">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 font-body text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> {isNo ? "Tilbake" : "Back"}
        </button>

        <h1 className="font-headline text-3xl font-bold text-headline mb-2">
          {isNo ? "Legg ut stillingsannonse" : "Post a job listing"}
        </h1>
        <p className="text-muted-foreground font-body mb-8">
          {isNo
            ? "Gratis basis-publisering for alle bedrifter i regionen. Velg eventuelt Premium for ekstra synlighet."
            : "Free basic posting for all regional employers. Optionally upgrade to Premium for extra visibility."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label={isNo ? "Stillingstittel" : "Job title"} required>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label={isNo ? "Bedrift" : "Company"} required>
              <input className="input" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </Field>
            <Field label="Org.nr">
              <input className="input" value={form.company_orgnr} onChange={(e) => setForm({ ...form, company_orgnr: e.target.value })} />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label={isNo ? "Sted" : "Location"} required>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label={isNo ? "Region" : "Region"}>
              <select className="input" value={form.region_slug} onChange={(e) => setForm({ ...form, region_slug: e.target.value })}>
                <option value="">{isNo ? "Velg region" : "Select region"}</option>
                {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label={isNo ? "Stillingstype" : "Type"}>
              <select className="input" value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{isNo ? t.label_no : t.label_en}</option>)}
              </select>
            </Field>
            <Field label={isNo ? "Bransje" : "Industry"}>
              <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label={isNo ? "Lønn (valgfritt)" : "Salary (optional)"}>
              <input className="input" value={form.salary_range} onChange={(e) => setForm({ ...form, salary_range: e.target.value })} />
            </Field>
            <Field label={isNo ? "Søknadsfrist" : "Deadline"}>
              <input type="date" className="input" value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} />
            </Field>
          </div>

          <Field label={isNo ? "Beskrivelse (HTML/tekst)" : "Description"} required>
            <textarea className="input min-h-[180px]" value={form.description_html} onChange={(e) => setForm({ ...form, description_html: e.target.value })} placeholder={isNo ? "Om stillingen, ansvar, kvalifikasjoner …" : "About the role, responsibilities, qualifications …"} />
          </Field>

          <Field label={isNo ? "Lenke til søknadsskjema" : "Application URL"}>
            <input className="input" placeholder="https://" value={form.application_url} onChange={(e) => setForm({ ...form, application_url: e.target.value })} />
          </Field>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label={isNo ? "Kontaktperson" : "Contact name"}>
              <input className="input" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </Field>
            <Field label="E-post">
              <input className="input" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
            </Field>
            <Field label={isNo ? "Telefon" : "Phone"}>
              <input className="input" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
            </Field>
          </div>

          {/* Premium upgrade */}
          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-6 mt-8">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-headline text-lg font-semibold text-headline">
                {isNo ? "Premium employer branding" : "Premium employer branding"}
              </h2>
              <span className="ml-auto font-headline text-lg font-bold text-headline">{PREMIUM_PRICE_NOK} kr</span>
            </div>
            <p className="text-sm text-muted-foreground font-body mb-3">
              {isNo ? "Per stilling. Inkluderer:" : "Per posting. Includes:"}
            </p>
            <ul className="space-y-1.5 text-sm font-body mb-4">
              {[
                isNo ? "Fremheving øverst i listen i 30 dager" : "Top-of-list highlight for 30 days",
                isNo ? "Bedriftsprofilside (logo, omslag, beskrivelse)" : "Employer profile page",
                isNo ? "Multiposting i flere regioner" : "Multi-region cross-posting",
                isNo ? "Statistikk på visninger og søknadsklikk" : "View & apply-click analytics",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="grid sm:grid-cols-3 gap-2">
              <PremiumOption active={premiumChoice === "none"} onClick={() => setPremiumChoice("none")}>
                {isNo ? "Nei takk" : "No thanks"}
              </PremiumOption>
              <PremiumOption active={premiumChoice === "stripe"} onClick={() => setPremiumChoice("stripe")}>
                {isNo ? "Betal nå (kort)" : "Pay now (card)"}
              </PremiumOption>
              <PremiumOption active={premiumChoice === "invoice"} onClick={() => setPremiumChoice("invoice")}>
                {isNo ? "Faktura/EHF" : "Invoice"}
              </PremiumOption>
            </div>

            {premiumChoice !== "none" && regions.length > 0 && (
              <div className="mt-5">
                <p className="text-sm font-body text-foreground mb-2">
                  {isNo ? "Multiposting – legg til flere regioner:" : "Multipost – add more regions:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {regions.map((r) => {
                    const checked = form.additional_regions.includes(r.slug) || form.region_slug === r.slug;
                    const isPrimary = form.region_slug === r.slug;
                    return (
                      <button
                        type="button"
                        key={r.slug}
                        disabled={isPrimary}
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            additional_regions: prev.additional_regions.includes(r.slug)
                              ? prev.additional_regions.filter((x) => x !== r.slug)
                              : [...prev.additional_regions, r.slug],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
                          checked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                        } ${isPrimary ? "opacity-60 cursor-default" : ""}`}
                      >
                        {r.name} {isPrimary ? `(${isNo ? "primær" : "primary"})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground font-body">
              {isNo ? "Total" : "Total"}: <span className="text-foreground font-medium">{totalNok} kr</span>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-body font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPremium
                ? isNo
                  ? "Send inn og fortsett"
                  : "Submit and continue"
                : isNo
                  ? "Send inn til moderering"
                  : "Submit for review"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-body text-foreground mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}

function PremiumOption({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm font-body border transition-colors ${
        active ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}