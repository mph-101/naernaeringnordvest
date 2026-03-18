import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Lock, Globe, Send, User } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface Message {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isJournalist?: boolean;
  isPrivate?: boolean;
}

interface ArticleDiscussionProps {
  authorName: string;
}

export function ArticleDiscussion({ authorName }: ArticleDiscussionProps) {
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [message, setMessage] = useState("");
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const { language } = useTheme();
  const navigate = useNavigate();

  const t = {
    no: {
      discussion: "Diskusjon",
      publicThread: "Offentlig tråd",
      privateMessage: "Privat melding",
      publicDesc: "Delta i offentlig diskusjon med andre lesere og journalisten",
      privateDesc: `Send en privat melding direkte til ${authorName}`,
      placeholder: "Skriv en kommentar...",
      placeholderPrivate: `Skriv en melding til ${authorName}...`,
      send: "Send",
      loginRequired: "Logg inn for å delta",
      loginDesc: "Du må være innlogget for å sende meldinger og delta i diskusjoner.",
      loginButton: "Logg inn",
      signupButton: "Opprett konto",
      membersOnly: "Kun for medlemmer",
      journalist: "Journalist",
      replies: "svar",
      hoursAgo: "timer siden",
      justNow: "Akkurat nå",
    },
    en: {
      discussion: "Discussion",
      publicThread: "Public Thread",
      privateMessage: "Private Message",
      publicDesc: "Join the public discussion with other readers and the journalist",
      privateDesc: `Send a private message directly to ${authorName}`,
      placeholder: "Write a comment...",
      placeholderPrivate: `Write a message to ${authorName}...`,
      send: "Send",
      loginRequired: "Log in to participate",
      loginDesc: "You need to be logged in to send messages and participate in discussions.",
      loginButton: "Log in",
      signupButton: "Create account",
      membersOnly: "Members only",
      journalist: "Journalist",
      replies: "replies",
      hoursAgo: "hours ago",
      justNow: "Just now",
    },
  };

  const text = t[language];

  // Mock messages for demo
  const mockPublicMessages: Message[] = [
    {
      id: "1",
      author: authorName,
      content: language === "no" 
        ? "Takk for interessen! Jeg svarer gjerne på spørsmål om denne saken."
        : "Thanks for your interest! Happy to answer any questions about this story.",
      timestamp: "2",
      isJournalist: true,
    },
    {
      id: "2",
      author: "Erik Hansen",
      content: language === "no"
        ? "Interessant analyse! Har du noen tanker om hvordan dette vil påvirke de mindre klubbene?"
        : "Interesting analysis! Do you have any thoughts on how this will affect smaller clubs?",
      timestamp: "1",
    },
    {
      id: "3",
      author: authorName,
      content: language === "no"
        ? "Godt spørsmål, Erik. Vi ser allerede tegn på at mindre klubber sliter med å konkurrere om talenter når de store aktørene har tilgang til PE-kapital."
        : "Good question, Erik. We're already seeing signs that smaller clubs struggle to compete for talent when the big players have access to PE capital.",
      timestamp: "1",
      isJournalist: true,
    },
  ];

  const mockPrivateMessages: Message[] = [
    {
      id: "1",
      author: authorName,
      content: language === "no"
        ? "Hei! Takk for meldingen. Hva kan jeg hjelpe deg med?"
        : "Hi! Thanks for reaching out. How can I help you?",
      timestamp: "3",
      isJournalist: true,
      isPrivate: true,
    },
  ];

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // In a real implementation, this would check auth and send to database
    setShowLoginPrompt(true);
    setMessage("");
  };

  const messages = activeTab === "public" ? mockPublicMessages : mockPrivateMessages;

  return (
    <div className="mt-12 border-t border-border pt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-headline text-xl font-bold text-headline">
            {text.discussion}
          </h2>
          <p className="text-sm text-muted-foreground font-body">
            {text.membersOnly}
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("public")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${
            activeTab === "public"
              ? "bg-primary text-primary-foreground shadow-soft"
              : "bg-card border border-border text-foreground hover:bg-secondary"
          }`}
        >
          <Globe className="w-4 h-4" />
          {text.publicThread}
        </button>
        <button
          onClick={() => setActiveTab("private")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-subhead font-medium transition-all ${
            activeTab === "private"
              ? "bg-primary text-primary-foreground shadow-soft"
              : "bg-card border border-border text-foreground hover:bg-secondary"
          }`}
        >
          <Lock className="w-4 h-4" />
          {text.privateMessage}
        </button>
      </div>

      {/* Tab Description */}
      <p className="text-sm text-muted-foreground font-body mb-6">
        {activeTab === "public" ? text.publicDesc : text.privateDesc}
      </p>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-xl ${
              msg.isJournalist
                ? "bg-accent/5 border border-accent/20"
                : "bg-card border border-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                msg.isJournalist ? "bg-accent/20" : "bg-secondary"
              }`}>
                <User className={`w-4 h-4 ${msg.isJournalist ? "text-accent" : "text-muted-foreground"}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-subhead text-sm font-semibold text-headline">
                  {msg.author}
                </span>
                {msg.isJournalist && (
                  <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-subhead font-medium rounded-full">
                    {text.journalist}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-body ml-auto">
                {msg.timestamp} {text.hoursAgo}
              </span>
            </div>
            <p className="text-foreground font-body leading-relaxed pl-10">
              {msg.content}
            </p>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder={activeTab === "public" ? text.placeholder : text.placeholderPrivate}
          className="w-full px-4 py-3 pr-12 bg-card border border-border rounded-xl font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
        <button
          onClick={handleSendMessage}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card rounded-2xl shadow-elevated max-w-sm w-full p-6 animate-scale-in">
            <div className="text-center">
              <div className="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-headline text-lg font-bold text-headline mb-2">
                {text.loginRequired}
              </h3>
              <p className="text-sm text-muted-foreground font-body mb-6">
                {text.loginDesc}
              </p>
              <div className="space-y-3">
                <button className="w-full py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
                  {text.loginButton}
                </button>
                <button className="w-full py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">
                  {text.signupButton}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
