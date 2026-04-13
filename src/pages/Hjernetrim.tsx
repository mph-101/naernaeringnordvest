import { useState } from "react";
import { Header } from "@/components/Header";
import { useTheme } from "@/hooks/useTheme";
import { translations } from "@/lib/translations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Grid3X3, Search, Puzzle } from "lucide-react";
import { SudokuGame } from "@/components/games/SudokuGame";
import { WordSearchGame } from "@/components/games/WordSearchGame";
import { WordAssemblyGame } from "@/components/games/WordAssemblyGame";

const Hjernetrim = () => {
  const { language } = useTheme();
  const isNo = language === "no";

  return (
    <div className="min-h-screen bg-background">
      <Header showSearch={false} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isNo ? "Hjernetrim" : "Brain Break"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isNo ? "Ta en kort pause med et minispill" : "Take a quick break with a mini-game"}
            </p>
          </div>
        </div>

        <Tabs defaultValue="sudoku" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sudoku" className="gap-1.5">
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">Sudoku</span>
            </TabsTrigger>
            <TabsTrigger value="wordsearch" className="gap-1.5">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{isNo ? "Finn ord" : "Word Search"}</span>
            </TabsTrigger>
            <TabsTrigger value="wordassembly" className="gap-1.5">
              <Puzzle className="h-4 w-4" />
              <span className="hidden sm:inline">{isNo ? "Sett sammen" : "Word Build"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sudoku">
            <SudokuGame language={language} />
          </TabsContent>
          <TabsContent value="wordsearch">
            <WordSearchGame language={language} />
          </TabsContent>
          <TabsContent value="wordassembly">
            <WordAssemblyGame language={language} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Hjernetrim;
