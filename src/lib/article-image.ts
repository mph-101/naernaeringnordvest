import article1Img from "@/assets/articles/article-1.jpg";
import article2Img from "@/assets/articles/article-2.jpg";
import article3Img from "@/assets/articles/article-3.jpg";
import article4Img from "@/assets/articles/article-4.jpg";
import article5Img from "@/assets/articles/article-5.jpg";
import article6Img from "@/assets/articles/article-6.jpg";

// Lives in its own module so feed components can import the thumbnail helper
// without pulling the legacy mock article dataset in lib/articles.ts into the
// critical front-page chunk.

const articleImages: Record<string, string> = {
  "1": article1Img,
  "2": article2Img,
  "3": article3Img,
  "4": article4Img,
  "5": article5Img,
  "6": article6Img,
};

// Generate a deterministic gradient thumbnail based on article id and category
export function getArticleImage(id: string, category: string): string {
  if (articleImages[id]) {
    return `url(${articleImages[id]})`;
  }
  // Dempede toner (S ≤ 30 %): kategorikoding uten å sprenge Én-stemme-regelen —
  // fullmettede fallback-flater dominerte leserflaten når flere bildeløse
  // artikler lastet samtidig (design-audit 2026-07-08).
  const gradients: Record<string, string> = {
    "Eiendom": "linear-gradient(135deg, hsl(220, 28%, 44%), hsl(255, 22%, 38%))",
    "Real Estate": "linear-gradient(135deg, hsl(220, 28%, 44%), hsl(255, 22%, 38%))",
    "Handel": "linear-gradient(135deg, hsl(155, 25%, 36%), hsl(180, 22%, 32%))",
    "Retail": "linear-gradient(135deg, hsl(155, 25%, 36%), hsl(180, 22%, 32%))",
    "Industri": "linear-gradient(135deg, hsl(25, 35%, 45%), hsl(40, 30%, 40%))",
    "Industry": "linear-gradient(135deg, hsl(25, 35%, 45%), hsl(40, 30%, 40%))",
    "Teknologi": "linear-gradient(135deg, hsl(280, 22%, 42%), hsl(310, 20%, 36%))",
    "Technology": "linear-gradient(135deg, hsl(280, 22%, 42%), hsl(310, 20%, 36%))",
    "Finans": "linear-gradient(135deg, hsl(205, 28%, 40%), hsl(220, 24%, 34%))",
    "Finance": "linear-gradient(135deg, hsl(205, 28%, 40%), hsl(220, 24%, 34%))",
    "Reiseliv": "linear-gradient(135deg, hsl(0, 30%, 45%), hsl(340, 25%, 38%))",
    "Tourism": "linear-gradient(135deg, hsl(0, 30%, 45%), hsl(340, 25%, 38%))",
  };
  return gradients[category] || "linear-gradient(135deg, hsl(28, 35%, 48%), hsl(15, 30%, 42%))";
}
