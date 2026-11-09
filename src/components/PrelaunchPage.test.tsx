import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const insert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ insert })) },
}));

import { PrelaunchPage } from "@/components/PrelaunchPage";

const fillAndSubmit = (value: string) => {
  fireEvent.change(screen.getByLabelText("E-postadresse"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Si fra til meg" }));
};

describe("PrelaunchPage", () => {
  beforeEach(() => {
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
  });

  it("has no navigation into the site", () => {
    render(<PrelaunchPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Kommer snart" })).toBeInTheDocument();
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs.every((href) => href?.startsWith("mailto:"))).toBe(true);
  });

  it("stores a normalised launch sign-up and confirms", async () => {
    render(<PrelaunchPage />);
    fillAndSubmit("  Kari@Example.NO ");
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
    expect(insert).toHaveBeenCalledWith({
      email: "kari@example.no",
      frequency: "weekly",
      topics: ["launch"],
      region_slugs: ["nordvestlandet"],
    });
  });

  it("rejects an invalid address without calling the backend", () => {
    render(<PrelaunchPage />);
    fillAndSubmit("ikke-en-adresse");
    expect(screen.getByText("Skriv inn en gyldig e-postadresse.")).toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("treats an address that is already on the list as success", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    render(<PrelaunchPage />);
    fillAndSubmit("kari@example.no");
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());
  });

  it("shows a plain-language error and never the raw backend message", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied for table" } });
    render(<PrelaunchPage />);
    fillAndSubmit("kari@example.no");
    await waitFor(() => expect(screen.getByText(/Påmeldingen gikk ikke gjennom/)).toBeInTheDocument());
    expect(screen.queryByText(/permission denied/)).not.toBeInTheDocument();
  });
});
