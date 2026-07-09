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
  const gradients: Record<string, string> = {
    "Eiendom": "linear-gradient(135deg, hsl(220, 70%, 50%), hsl(260, 60%, 40%))",
    "Real Estate": "linear-gradient(135deg, hsl(220, 70%, 50%), hsl(260, 60%, 40%))",
    "Handel": "linear-gradient(135deg, hsl(150, 60%, 40%), hsl(180, 50%, 35%))",
    "Retail": "linear-gradient(135deg, hsl(150, 60%, 40%), hsl(180, 50%, 35%))",
    "Industri": "linear-gradient(135deg, hsl(25, 80%, 50%), hsl(45, 70%, 45%))",
    "Industry": "linear-gradient(135deg, hsl(25, 80%, 50%), hsl(45, 70%, 45%))",
    "Teknologi": "linear-gradient(135deg, hsl(280, 60%, 50%), hsl(310, 50%, 40%))",
    "Technology": "linear-gradient(135deg, hsl(280, 60%, 50%), hsl(310, 50%, 40%))",
    "Finans": "linear-gradient(135deg, hsl(200, 70%, 45%), hsl(220, 60%, 35%))",
    "Finance": "linear-gradient(135deg, hsl(200, 70%, 45%), hsl(220, 60%, 35%))",
    "Reiseliv": "linear-gradient(135deg, hsl(0, 65%, 50%), hsl(340, 60%, 40%))",
    "Tourism": "linear-gradient(135deg, hsl(0, 65%, 50%), hsl(340, 60%, 40%))",
  };
  return gradients[category] || "linear-gradient(135deg, hsl(30, 70%, 50%), hsl(20, 60%, 40%))";
}
