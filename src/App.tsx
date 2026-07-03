import { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Award,
  CheckCircle2,
  Bookmark,
  Sparkles,
  RotateCw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Search,
  Compass,
  Flame,
  Maximize2,
  Minimize2,
  Filter,
  Info,
  RefreshCw,
  BookMarked,
  Layers,
  HelpCircle,
  Play,
  Square,
  Home
} from "lucide-react";

import { Module, Flashcard } from "./types";
import { modulesGroup1 } from "./data/modules_group1";
import { modulesGroup2 } from "./data/modules_group2";
import { modulesGroup3 } from "./data/modules_group3";
import { modulesGroup4 } from "./data/modules_group4";

// Combine all modules into a single list
const allModules: Module[] = [
  ...modulesGroup1,
  ...modulesGroup2,
  ...modulesGroup3,
  ...modulesGroup4,
];

// Identical vectorized SVG logo component
function LogoHeader() {
  return (
    <div id="logo-vector-svg" className="flex items-center justify-center p-2 bg-white rounded-xl shadow-md w-14 h-14 sm:w-20 sm:h-20 shrink-0 border border-slate-200">
      <svg
        viewBox="0 0 100 100"
        className="w-10 h-10 sm:w-16 sm:h-16 text-[#2b5c8f]"
        fill="currentColor"
      >
        {/* Outer thick circle matching the official logo */}
        <circle
          cx="50"
          cy="50"
          r="43.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
        />
        {/* Central arrow (arrowhead + stem) */}
        <path
          d="M 50,11 L 69,38 L 54.5,38 L 54.5,75 L 50,89 L 45.5,75 L 45.5,38 L 31,38 Z"
          fill="currentColor"
        />
        {/* Left page of open book */}
        <path
          d="M 45.5,48 L 19,34 L 19,67 C 19,67 29,81 45.5,82 L 45.5,48 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right page of open book */}
        <path
          d="M 54.5,48 L 81,34 L 81,67 C 81,67 71,81 54.5,82 L 54.5,48 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function App() {
  // --- STATE ---
  const [currentTab, setCurrentTab] = useState<"dashboard" | "study" | "search">("dashboard");
  const [selectedModuleId, setSelectedModuleId] = useState<number>(1);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isHorizontalMode, setIsHorizontalMode] = useState<boolean>(false);
  
  // Learned cards state: stored as flat array of card IDs (e.g. ["m1_1", "m2_5"])
  const [learnedCardIds, setLearnedCardIds] = useState<string[]>([]);
  
  // Search query & filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchModuleId, setSearchModuleId] = useState<number | "all">("all");
  const [searchStatus, setSearchStatus] = useState<"all" | "learned" | "pending">("all");
  
  // Dashboard filters
  const [dashboardFilter, setDashboardFilter] = useState<"all" | "none" | "progress" | "completed">("all");
  
  // Streak tracking state
  const [streak, setStreak] = useState<number>(0);
  
  // TTS (Speech Synthesis) state
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingTextId, setSpeakingTextId] = useState<string | null>(null); // tracks exact text being spoken
  
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load persistence data
  useEffect(() => {
    const saved = localStorage.getItem("itt_learned_cards");
    if (saved) {
      try {
        setLearnedCardIds(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading learned cards", e);
      }
    }
    
    // Load study streak
    const savedStreak = localStorage.getItem("itt_streak_count");
    const lastDateStr = localStorage.getItem("itt_last_study_date");
    if (savedStreak) {
      const parsedStreak = parseInt(savedStreak, 10);
      const todayStr = new Date().toDateString();
      
      if (lastDateStr === todayStr) {
        setStreak(parsedStreak);
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastDateStr === yesterday.toDateString()) {
          setStreak(parsedStreak);
        } else {
          // Streak died
          setStreak(0);
          localStorage.setItem("itt_streak_count", "0");
        }
      }
    }
  }, []);

  // Save learned cards helper
  const saveLearnedCards = (newIds: string[]) => {
    setLearnedCardIds(newIds);
    localStorage.setItem("itt_learned_cards", JSON.stringify(newIds));
    
    // Update streak on learning a card
    updateStreak();
  };

  const updateStreak = () => {
    const todayStr = new Date().toDateString();
    const lastDateStr = localStorage.getItem("itt_last_study_date");
    
    if (lastDateStr !== todayStr) {
      let newStreak = 1;
      if (lastDateStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastDateStr === yesterday.toDateString()) {
          newStreak = streak + 1;
        }
      }
      setStreak(newStreak);
      localStorage.setItem("itt_streak_count", newStreak.toString());
      localStorage.setItem("itt_last_study_date", todayStr);
    }
  };

  const handleResetProgress = () => {
    if (window.confirm("¿Está seguro de que desea reiniciar todo su progreso de estudio? Esta acción desmarcará todas las preguntas aprendidas.")) {
      saveLearnedCards([]);
      setStreak(0);
      localStorage.setItem("itt_streak_count", "0");
      localStorage.removeItem("itt_last_study_date");
      stopSpeaking();
    }
  };

  // Stop current TTS
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingTextId(null);
  };

  // Perform TTS
  const speak = (text: string, textId: string) => {
    if (!window.speechSynthesis) {
      alert("Lo sentimos, su navegador no soporta la función de lectura en voz alta.");
      return;
    }

    if (isSpeaking && speakingTextId === textId) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    // Clean text of bracket notes
    const cleanText = text.replace(/\[.*?\]/g, "").replace(/\(.*?\)/g, "").trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-ES";
    
    // Try to find a premium Spanish voice if possible
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang.startsWith("es-")) || voices[0];
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingTextId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingTextId(null);
    };

    speechUtteranceRef.current = utterance;
    setIsSpeaking(true);
    setSpeakingTextId(textId);
    window.speechSynthesis.speak(utterance);
  };

  // Clean TTS on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);



  // --- DERIVED METRICS ---
  const currentModule = useMemo(() => {
    return allModules.find(m => m.id === selectedModuleId) || allModules[0];
  }, [selectedModuleId]);

  const currentCard = useMemo(() => {
    return currentModule.cards[currentCardIndex] || currentModule.cards[0];
  }, [currentModule, currentCardIndex]);

  const globalTotalCards = 480;
  const globalLearnedCount = learnedCardIds.length;
  const globalProgressPercent = Math.round((globalLearnedCount / globalTotalCards) * 100);

  // Compute learned counts per module
  const moduleMetrics = useMemo(() => {
    return allModules.map(m => {
      const learnedInModule = m.cards.filter(c => learnedCardIds.includes(c.id)).length;
      const pct = Math.round((learnedInModule / m.cards.length) * 100);
      let status: "none" | "progress" | "completed" = "none";
      if (learnedInModule === m.cards.length) {
        status = "completed";
      } else if (learnedInModule > 0) {
        status = "progress";
      }
      
      return {
        id: m.id,
        title: m.title,
        description: m.description,
        total: m.cards.length,
        learned: learnedInModule,
        percent: pct,
        status
      };
    });
  }, [learnedCardIds]);

  const completedModulesCount = moduleMetrics.filter(m => m.status === "completed").length;

  const filteredModules = useMemo(() => {
    return moduleMetrics.filter(m => {
      if (dashboardFilter === "all") return true;
      if (dashboardFilter === "none") return m.status === "none";
      if (dashboardFilter === "progress") return m.status === "progress";
      if (dashboardFilter === "completed") return m.status === "completed";
      return true;
    });
  }, [moduleMetrics, dashboardFilter]);

  // Global Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() && searchModuleId === "all" && searchStatus === "all") {
      return [];
    }

    const query = searchQuery.toLowerCase().trim();
    const results: { moduleTitle: string; moduleId: number; cardIndex: number; card: Flashcard }[] = [];

    allModules.forEach(m => {
      // Filter by module if selected
      if (searchModuleId !== "all" && m.id !== searchModuleId) {
        return;
      }

      m.cards.forEach((card, idx) => {
        const isLearned = learnedCardIds.includes(card.id);
        
        // Filter by status if selected
        if (searchStatus === "learned" && !isLearned) return;
        if (searchStatus === "pending" && isLearned) return;

        const matchesQuery = !query || 
          card.question.toLowerCase().includes(query) || 
          card.answer.toLowerCase().includes(query);

        if (matchesQuery) {
          results.push({
            moduleTitle: m.title,
            moduleId: m.id,
            cardIndex: idx,
            card
          });
        }
      });
    });

    return results;
  }, [searchQuery, searchModuleId, searchStatus, learnedCardIds]);

  // --- ACTIONS ---
  const handlePrevCard = () => {
    setIsFlipped(false);
    stopSpeaking();
    setCurrentCardIndex(prev => (prev > 0 ? prev - 1 : currentModule.cards.length - 1));
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    stopSpeaking();
    setCurrentCardIndex(prev => (prev < currentModule.cards.length - 1 ? prev + 1 : 0));
  };

  const toggleCardLearned = (cardId: string) => {
    if (learnedCardIds.includes(cardId)) {
      saveLearnedCards(learnedCardIds.filter(id => id !== cardId));
    } else {
      saveLearnedCards([...learnedCardIds, cardId]);
    }
  };

  const startStudyingModule = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCurrentTab("study");
    stopSpeaking();
  };

  const jumpToCard = (moduleId: number, cardIndex: number) => {
    setSelectedModuleId(moduleId);
    setCurrentCardIndex(cardIndex);
    setIsFlipped(false);
    setCurrentTab("study");
    stopSpeaking();
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${currentTab === "search" ? "bg-slate-50 text-slate-800" : "bg-[#07111e] text-slate-100"}`}>
      
      {/* --- HEADER --- */}
      <header className="bg-linear-to-r from-brand-dark via-[#0a2540] to-brand-interactive text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative mesh overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_50%)]" />
        
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 relative z-10">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 sm:gap-6 text-left flex-row w-full md:w-auto">
            <LogoHeader />
            <div>
              <div className="flex items-center gap-2 justify-start">
                <span className="text-amber-400 font-extrabold tracking-widest text-xs sm:text-sm uppercase font-display">
                  GUIA DOCENTE
                </span>
              </div>
              <h1 className="text-lg sm:text-3xl font-bold tracking-tight font-display mt-0.5 text-slate-100">
                Banco de Preguntas
              </h1>
              <p className="text-[10px] sm:text-sm text-slate-200 font-medium max-w-xl mt-0.5 leading-tight sm:leading-relaxed">
                Personal Directivo y Docentes de Institutos Técnicos y Tecnológicos de Bolivia
              </p>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="flex items-center gap-4 sm:gap-6 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/10 w-full md:w-auto justify-around sm:justify-center">
            
            {/* Global Progress circle-bar */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="20" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="transparent" stroke="#f59e0b" strokeWidth="4" 
                    strokeDasharray={2 * Math.PI * 20} 
                    strokeDashoffset={2 * Math.PI * 20 * (1 - Math.min(globalProgressPercent, 100) / 100)} 
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-amber-400">
                  {globalProgressPercent}%
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-300">
                  Progreso Global
                </span>
                <span className="text-sm font-bold block text-slate-100">
                  {globalLearnedCount} <span className="text-[10px] text-slate-300 font-normal">/ 480</span>
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-white/20" />

            {/* Streak count */}
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${streak > 0 ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-slate-400"}`}>
                <Flame className={`w-5 h-5 ${streak > 0 ? "fill-amber-400 animate-pulse" : ""}`} />
              </div>
              <div>
                <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-300">
                  Racha Diaria
                </span>
                <span className="text-sm font-bold block text-slate-100">
                  {streak} {streak === 1 ? "día" : "días"}
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* Global Progress Line Highlight */}
        <div className="h-1.5 w-full bg-slate-800/80 relative">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 transition-all duration-500" 
            style={{ width: `${globalProgressPercent}%` }}
          />
        </div>
      </header>

      {/* --- NAVIGATION NAVIGATION TABS --- */}
      <div className={`sticky top-0 z-40 border-b transition-colors duration-300 ${currentTab === "search" ? "bg-white border-slate-200/80 shadow-xs" : "bg-[#0a192f] border-slate-800 shadow-md"}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <nav className="flex gap-1.5 py-3 overflow-x-auto" aria-label="Navegación principal">
              <button
                id="btn-tab-dashboard"
                onClick={() => setCurrentTab("dashboard")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "dashboard"
                    ? "bg-[#0d3b66] text-white shadow-md font-bold border border-cyan-700/55"
                    : currentTab === "search"
                    ? "text-slate-600 hover:text-[#0d3b66] hover:bg-slate-100 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold"
                }`}
              >
                <Compass className="w-4.5 h-4.5" />
                <span>Panel de Módulos</span>
              </button>

              <button
                id="btn-tab-study"
                onClick={() => setCurrentTab("study")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "study"
                    ? "bg-[#0d3b66] text-white shadow-md font-bold border border-cyan-700/55"
                    : currentTab === "search"
                    ? "text-slate-600 hover:text-[#0d3b66] hover:bg-slate-100 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60 font-semibold"
                }`}
              >
                <BookOpen className="w-4.5 h-4.5" />
                <span>Estudiar Flashcards</span>
              </button>

              <button
                id="btn-tab-search"
                onClick={() => setCurrentTab("search")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === "search"
                    ? "bg-amber-500 text-slate-950 font-black shadow-md border border-amber-600"
                    : currentTab === "search"
                    ? "text-slate-600 hover:text-[#0d3b66] hover:bg-slate-100 font-semibold"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-950/20 font-semibold"
                }`}
              >
                <Search className="w-4.5 h-4.5" />
                <span>Buscador y Banco</span>
              </button>
            </nav>

            <button
              id="btn-global-reset"
              onClick={handleResetProgress}
              className={`text-xs p-2 rounded-lg transition-all flex items-center gap-1 border border-transparent cursor-pointer ${
                currentTab === "search"
                  ? "text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                  : "text-slate-400 hover:text-red-400 hover:bg-red-950/40 hover:border-red-900/40"
              }`}
              title="Reiniciar progreso"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reiniciar Progreso</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- MAIN MAIN CONTAINER --- */}
      <main className="grow max-w-7xl mx-auto px-4 py-6 sm:py-8 w-full">
        
        {/* --- VIEW 1: DASHBOARD --- */}
        {currentTab === "dashboard" && (
          <div id="view-dashboard" className="space-y-6 sm:space-y-8 animate-fadeIn">
            
            {/* Quick Informative banner */}
            <div className="bg-slate-900 border border-slate-800 border-l-4 border-amber-500 p-5 rounded-r-2xl flex items-start gap-3.5 shadow-xl">
              <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-amber-400 text-sm tracking-wide">Contenido 100% Oficial de la Convocatoria</h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  Esta plataforma contiene los 16 módulos completos de la normativa básica para personal directivo y docente. Cada módulo incluye exactamente 30 tarjetas de estudio extraídas de forma fiel y literal de las fuentes proporcionadas por el Ministerio de Educación.
                </p>
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-[#0d3b66]/30 text-sky-400 rounded-xl">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Módulos Registrados</span>
                  <span className="text-2xl font-black block text-slate-100">16 Módulos</span>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-emerald-950/40 text-emerald-400 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Módulos Completados</span>
                  <span className="text-2xl font-black block text-slate-100">{completedModulesCount} / 16</span>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-amber-950/40 text-amber-400 rounded-xl">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Total Preguntas</span>
                  <span className="text-2xl font-black block text-slate-100">480 Items</span>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-4">
                <div className="p-3 bg-sky-950/40 text-sky-400 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Preguntas Memorizadas</span>
                  <span className="text-2xl font-black block text-slate-100">
                    {globalLearnedCount} <span className="text-sm font-normal text-slate-400">({globalProgressPercent}%)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Grid title & filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-100 tracking-tight font-display flex items-center gap-2">
                  <BookMarked className="w-5 h-5 text-amber-400" />
                  Módulos de Estudio
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Seleccione un módulo temático para comenzar su sesión de estudio interactivo</p>
              </div>

              {/* Filtering tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start">
                <button
                  onClick={() => setDashboardFilter("all")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    dashboardFilter === "all" ? "bg-[#0d3b66] text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setDashboardFilter("none")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    dashboardFilter === "none" ? "bg-[#0d3b66] text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Sin Empezar
                </button>
                <button
                  onClick={() => setDashboardFilter("progress")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    dashboardFilter === "progress" ? "bg-[#0d3b66] text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  En Progreso
                </button>
                <button
                  onClick={() => setDashboardFilter("completed")}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    dashboardFilter === "completed" ? "bg-[#0d3b66] text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Dominados
                </button>
              </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModules.map((m) => {
                const badgeColor = 
                  m.status === "completed" 
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/50" 
                    : m.status === "progress" 
                    ? "bg-amber-950/60 text-amber-400 border-amber-800/50" 
                    : "bg-slate-950/80 text-slate-400 border-slate-800";

                const badgeText = 
                  m.status === "completed" 
                    ? "¡Dominado!" 
                    : m.status === "progress" 
                    ? "En progreso" 
                    : "No iniciado";

                return (
                  <div 
                    key={m.id} 
                    id={`module-card-${m.id}`}
                    className="bg-slate-900 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-800 hover:border-[#0d3b66] transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Header accent strip */}
                    <div className={`h-1.5 w-full ${
                      m.status === "completed" 
                        ? "bg-emerald-500" 
                        : m.status === "progress" 
                        ? "bg-amber-400" 
                        : "bg-slate-800 group-hover:bg-[#0d3b66]"
                    } transition-colors duration-200`} />
                    
                    <div className="p-6 flex-grow">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono tracking-widest uppercase">
                          MÓDULO {m.id}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                          {badgeText}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-400 font-display tracking-tight leading-snug line-clamp-2 transition-colors duration-200">
                        {m.title}
                      </h3>
                      
                      <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    {/* Progress details */}
                    <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between gap-4">
                      <div className="grow">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-1">
                          <span>Progreso de estudio</span>
                          <span className="font-bold text-slate-200">{m.learned} / {m.total}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${m.status === "completed" ? "bg-emerald-500" : "bg-amber-400"}`}
                            style={{ width: `${m.percent}%` }}
                          />
                        </div>
                      </div>

                      <button
                        id={`btn-study-module-${m.id}`}
                        onClick={() => startStudyingModule(m.id)}
                        className={`text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                          m.status === "completed"
                            ? "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 shadow-sm"
                            : m.status === "progress"
                            ? "bg-[#0d3b66] text-white hover:bg-[#0a2540] shadow-sm border border-cyan-800"
                            : "bg-[#0a2540] text-white hover:bg-[#0d3b66] shadow-sm border border-slate-800"
                        }`}
                      >
                        {m.status === "none" ? "Iniciar" : "Continuar"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredModules.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <BookMarked className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium text-sm">No hay módulos que coincidan con este filtro.</p>
                  <button 
                    onClick={() => setDashboardFilter("all")} 
                    className="text-xs font-bold text-amber-400 hover:underline mt-2 cursor-pointer"
                  >
                    Ver todos los módulos
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- VIEW 2: FLASHCARD STUDY --- */}
        {currentTab === "study" && (
          <div id="view-study" className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
            
            {/* Study Header & back button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-start gap-3">
                <button 
                  id="btn-back-to-dashboard"
                  onClick={() => { setCurrentTab("dashboard"); stopSpeaking(); }}
                  className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl transition-all border border-slate-800 text-slate-300 hover:text-white cursor-pointer shadow-sm"
                  title="Volver al panel"
                >
                  <Home className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/50 font-mono tracking-widest uppercase">
                      MÓDULO {currentModule.id}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold">
                      Progreso: {currentModule.cards.filter(c => learnedCardIds.includes(c.id)).length} de 30 ({Math.round((currentModule.cards.filter(c => learnedCardIds.includes(c.id)).length / 30) * 100)}%)
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-100 leading-snug tracking-tight font-display mt-1 line-clamp-1">
                    {currentModule.title}
                  </h2>
                </div>
              </div>

              {/* Layout controls */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-view-mode"
                  onClick={() => setIsHorizontalMode(!isHorizontalMode)}
                  className={`text-xs px-3.5 py-2 rounded-xl font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isHorizontalMode 
                      ? "bg-[#0d3b66] text-white border-cyan-800 shadow-md" 
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white shadow-sm"
                  }`}
                  title="Cambiar formato de visualización"
                >
                  {isHorizontalMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isHorizontalMode ? "Vista Normal (3D)" : "Vista Completa/Plana"}</span>
                </button>
              </div>
            </div>

            {/* Progress bar of current module */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
                <span>PREGUNTA {currentCardIndex + 1} DE 30</span>
                <span className="text-slate-500 font-mono">ID: {currentCard.id}</span>
              </div>
              <div className="w-full h-2 bg-slate-850 rounded-full overflow-hidden relative border border-slate-800 shadow-inner">
                {/* Visual marker of current card index */}
                <div 
                  className="absolute top-0 bottom-0 bg-sky-500/30 transition-all duration-300"
                  style={{ width: `${((currentCardIndex + 1) / 30) * 100}%` }}
                />
                {/* Visual progress of learned items in this module */}
                <div 
                  className="absolute top-0 bottom-0 bg-emerald-500 h-full transition-all duration-300"
                  style={{ 
                    width: `${(currentModule.cards.filter(c => learnedCardIds.includes(c.id)).length / 30) * 100}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-medium px-1">
                <span>Progreso en el módulo (Línea verde)</span>
                <span>Posición actual (Línea azul translúcida)</span>
              </div>
            </div>

            {/* --- ACTIVE FLASHCARD COMPONENT --- */}
            {!isHorizontalMode ? (
              // --- STANDARD 3D ROTATABLE CARD ---
              <div className="flex flex-col items-center">
                <div 
                  id="flashcard-3d-container"
                  onClick={() => { setIsFlipped(!isFlipped); stopSpeaking(); }}
                  className="perspective-1000 w-full max-w-2xl h-[420px] xs:h-[450px] sm:h-[480px] relative cursor-pointer group"
                >
                  <div className={`w-full h-full duration-500 transform-style-3d relative transition-all ${isFlipped ? "rotate-y-180" : ""}`}>
                    
                    {/* Front side (Question) */}
                    <div className="absolute inset-0 bg-slate-900 border-2 border-slate-800 text-white rounded-2xl backface-hidden shadow-2xl flex flex-col justify-between p-5 sm:p-8 hover:shadow-cyan-900/10 hover:border-slate-700/80 transition-all">
                      {/* Top ribbon */}
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-extrabold tracking-widest font-mono uppercase text-amber-400/90">
                          PREGUNTA OFICIAL • TOCA PARA REVELAR
                        </span>
                        <HelpCircle className="w-5 h-5 text-amber-400" />
                      </div>

                      {/* Main Question Text */}
                      <div className="text-center my-auto px-2 sm:px-4 max-h-[290px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                        <h3 className="text-white font-display font-black text-2xl xs:text-3xl sm:text-4xl leading-normal tracking-tight">
                          {currentCard.question}
                        </h3>
                      </div>

                      {/* Bottom actions */}
                      <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(currentCard.question, `${currentCard.id}_q`);
                          }}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                            speakingTextId === `${currentCard.id}_q` 
                              ? "bg-amber-500 text-slate-950 font-black" 
                              : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                          }`}
                          title="Leer pregunta en voz alta"
                        >
                          {speakingTextId === `${currentCard.id}_q` ? (
                            <div className="flex items-center gap-1 text-xs">
                              <VolumeX className="w-4 h-4 animate-bounce" />
                              <span>Detener</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs">
                              <Volume2 className="w-4 h-4" />
                              <span>Escuchar</span>
                            </div>
                          )}
                        </button>

                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider animate-pulse">
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Ver Respuesta</span>
                        </div>
                      </div>
                    </div>

                    {/* Back side (Answer) */}
                    <div className="absolute inset-0 bg-slate-950 rounded-2xl border-2 border-[#0d3b66] rotate-y-180 backface-hidden shadow-2xl flex flex-col justify-between p-5 sm:p-8">
                      
                      {/* Top ribbon */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold tracking-widest font-mono uppercase text-emerald-400 font-black bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/80">
                          RESPUESTA OFICIAL
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Literal de la fuente oficial
                        </span>
                      </div>

                      {/* Main Answer Text */}
                      <div className="my-auto px-1 sm:px-4 max-h-[290px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                        <p className="text-slate-100 font-medium text-lg xs:text-xl sm:text-2xl leading-relaxed text-justify">
                          {currentCard.answer}
                        </p>
                      </div>

                      {/* Bottom actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(currentCard.answer, `${currentCard.id}_a`);
                          }}
                          className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                            speakingTextId === `${currentCard.id}_a` 
                              ? "bg-amber-500 text-slate-950 font-black" 
                              : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                          }`}
                          title="Leer respuesta en voz alta"
                        >
                          {speakingTextId === `${currentCard.id}_a` ? (
                            <div className="flex items-center gap-1 text-xs">
                              <VolumeX className="w-4 h-4 animate-bounce" />
                              <span>Detener</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs">
                              <Volume2 className="w-4 h-4" />
                              <span>Escuchar</span>
                            </div>
                          )}
                        </button>

                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Girar de nuevo</span>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3 font-medium text-center">
                  Consejo: Puede hacer clic o tocar sobre la tarjeta para girarla.
                </p>
              </div>
            ) : (
              // --- FULL FLAT/HORIZONTAL MODE (Side-by-Side or Stacked without rotating) ---
              <div id="flashcard-flat-container" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mx-auto">
                
                {/* Question panel */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 sm:p-8 shadow-xl flex flex-col justify-between min-h-[260px] sm:min-h-[320px] text-white">
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest font-mono text-amber-400 block mb-3 uppercase">
                      PREGUNTA DEL MÓDULO
                    </span>
                    <h3 className="text-white font-display font-black text-xl xs:text-2xl sm:text-3xl leading-snug">
                      {currentCard.question}
                    </h3>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => speak(currentCard.question, `${currentCard.id}_q`)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        speakingTextId === `${currentCard.id}_q`
                          ? "bg-amber-50 text-slate-950 font-bold"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {speakingTextId === `${currentCard.id}_q` ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{speakingTextId === `${currentCard.id}_q` ? "Detener Audio" : "Escuchar Pregunta"}</span>
                    </button>
                    <span className="text-xs font-semibold text-slate-400">Pregunta {currentCardIndex + 1}</span>
                  </div>
                </div>

                {/* Answer panel */}
                <div className="bg-slate-950 rounded-2xl border-2 border-[#0d3b66] p-5 sm:p-8 shadow-xl flex flex-col justify-between min-h-[260px] sm:min-h-[320px] text-white">
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest font-mono text-emerald-400 block mb-3 uppercase">
                      RESPUESTA DE LA NORMATIVA
                    </span>
                    <p className="text-slate-100 font-medium text-lg xs:text-xl sm:text-2xl leading-relaxed text-justify">
                      {currentCard.answer}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => speak(currentCard.answer, `${currentCard.id}_a`)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        speakingTextId === `${currentCard.id}_a`
                          ? "bg-amber-50 text-slate-950 font-bold"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {speakingTextId === `${currentCard.id}_a` ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{speakingTextId === `${currentCard.id}_a` ? "Detener Audio" : "Escuchar Respuesta"}</span>
                    </button>
                    <span className="text-xs font-semibold text-slate-400">Literal oficial</span>
                  </div>
                </div>

              </div>
            )}

            {/* --- CONTROLS SECTION --- */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xl">
              
              {/* Mastery Indicator / Button */}
              <div className="w-full sm:w-auto text-center sm:text-left">
                {learnedCardIds.includes(currentCard.id) ? (
                  <button
                    id="btn-mark-unlearned"
                    onClick={() => toggleCardLearned(currentCard.id)}
                    className="w-full sm:w-auto text-xs font-extrabold px-5 py-3 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                  >
                    <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>Aprendido (Haga clic para desmarcar)</span>
                  </button>
                ) : (
                  <button
                    id="btn-mark-learned"
                    onClick={() => toggleCardLearned(currentCard.id)}
                    className="w-full sm:w-auto text-xs font-extrabold px-5 py-3 rounded-xl bg-[#0d3b66] text-white hover:bg-[#0a2540] border border-cyan-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] gold-flash-effect"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>¡Ya me lo sé! (Marcar como aprendido)</span>
                  </button>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                <button
                  id="btn-prev-card"
                  onClick={handlePrevCard}
                  className="flex items-center justify-center gap-1 text-xs font-extrabold px-4 py-3 rounded-xl bg-[#0d3b66] text-white hover:bg-[#0a2540] transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Anterior</span>
                </button>

                {/* Flip button only available in 3D Mode */}
                {!isHorizontalMode && (
                  <button
                    id="btn-flip-card"
                    onClick={() => { setIsFlipped(!isFlipped); stopSpeaking(); }}
                    className="flex items-center justify-center gap-1.5 text-xs font-extrabold px-5 py-3 rounded-xl bg-[#0d3b66] text-white hover:bg-[#0a2540] transition-all shadow-md cursor-pointer min-h-[44px] w-full sm:w-auto border border-cyan-800"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Girar</span>
                  </button>
                )}

                <button
                  id="btn-next-card"
                  onClick={handleNextCard}
                  className="flex items-center justify-center gap-1 text-xs font-extrabold px-4 py-3 rounded-xl bg-[#0d3b66] text-white hover:bg-[#0a2540] transition-all cursor-pointer min-h-[44px] w-full sm:w-auto"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>



          </div>
        )}

        {/* --- VIEW 3: GLOBAL SEARCH & QUESTION BANK --- */}
        {currentTab === "search" && (
          <div id="view-search" className="space-y-6 sm:space-y-8 animate-fadeIn">
            
            {/* Title & description */}
            <div className="border-l-4 border-amber-500 pl-4 py-1">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-display flex items-center gap-2.5">
                <Search className="w-5.5 h-5.5 text-amber-500" />
                Buscador y Banco de Preguntas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Busque palabras clave en tiempo real a lo largo de las 480 preguntas de la normativa boliviana.
              </p>
            </div>

            {/* Filters Bar highlighted with amber/yellow */}
            <div className="bg-amber-50/20 p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Search Text Input */}
                <div>
                  <label htmlFor="input-search-text" className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1.5">
                    Palabra Clave
                  </label>
                  <div className="relative">
                    <input
                      id="input-search-text"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Escriba violencia, SAFCO, CECA, etc..."
                      className="w-full text-sm bg-white border border-amber-200 hover:border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 px-4 py-2.5 pl-10 rounded-xl transition-all focus:outline-none"
                    />
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-amber-500" />
                  </div>
                </div>

                {/* Module filter */}
                <div>
                  <label htmlFor="select-search-module" className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1.5">
                    Módulo Específico
                  </label>
                  <select
                    id="select-search-module"
                    value={searchModuleId}
                    onChange={(e) => setSearchModuleId(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="w-full text-sm bg-white border border-amber-200 hover:border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 px-4 py-2.5 rounded-xl transition-all focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todos los Módulos (16)</option>
                    {allModules.map(m => (
                      <option key={m.id} value={m.id}>
                        Módulo {m.id} - {m.title.replace(/Módulo \d+\.\s*/, "")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div>
                  <label htmlFor="select-search-status" className="block text-xs font-bold text-amber-800 uppercase tracking-wide mb-1.5">
                    Estado de Estudio
                  </label>
                  <select
                    id="select-search-status"
                    value={searchStatus}
                    onChange={(e) => setSearchStatus(e.target.value as any)}
                    className="w-full text-sm bg-white border border-amber-200 hover:border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 px-4 py-2.5 rounded-xl transition-all focus:outline-none cursor-pointer"
                  >
                    <option value="all">Cualquier Estado</option>
                    <option value="learned">Solo Aprendidos</option>
                    <option value="pending">Aún en Estudio / Sin Aprender</option>
                  </select>
                </div>

              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-amber-100 pt-3 flex-wrap gap-2">
                <span>
                  Resultados encontrados: <strong className="text-amber-800">{searchResults.length}</strong>
                </span>
                { (searchQuery || searchModuleId !== "all" || searchStatus !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSearchModuleId("all");
                      setSearchStatus("all");
                    }}
                    className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>

            {/* Results list */}
            <div className="space-y-4">
              {searchResults.map((res, index) => {
                const isLearned = learnedCardIds.includes(res.card.id);
                
                return (
                  <div
                    key={`${res.card.id}_search_${index}`}
                    id={`search-item-${res.card.id}`}
                    className="bg-white rounded-xl border border-amber-200/60 shadow-xs hover:shadow-md transition-all p-5 flex flex-col md:flex-row items-start justify-between gap-4 hover:border-amber-400"
                  >
                    <div className="grow space-y-3">
                      {/* Badge / Context */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                          MÓDULO {res.moduleId}
                        </span>
                        <span className="text-xs text-slate-600 font-semibold line-clamp-1 max-w-xs sm:max-w-md">
                          {res.moduleTitle}
                        </span>
                        {isLearned ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprendido
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                            <Bookmark className="w-3 h-3" />
                            Aún por aprender
                          </span>
                        )}
                      </div>

                      {/* Question */}
                      <div className="space-y-1">
                        <span className="block text-[10px] font-extrabold uppercase font-mono tracking-widest text-amber-600">
                          Pregunta de Estudio
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                          {res.card.question}
                        </h4>
                      </div>

                      {/* Answer snippet */}
                      <div className="space-y-1">
                        <span className="block text-[10px] font-extrabold uppercase font-mono tracking-widest text-amber-600">
                          Respuesta Literal
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-amber-50/20 p-3 rounded-lg border border-amber-100/30">
                          {res.card.answer}
                        </p>
                      </div>

                    </div>

                    {/* Jump action button */}
                    <div className="shrink-0 self-end md:self-center">
                      <button
                        onClick={() => jumpToCard(res.moduleId, res.cardIndex)}
                        className="text-xs font-black px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-600 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer border border-amber-600"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-slate-950" />
                        <span>Abrir en Estudio</span>
                      </button>
                    </div>

                  </div>
                );
              })}

              {searchResults.length === 0 && (
                <div className="text-center py-12 bg-amber-50/10 rounded-2xl border border-amber-200">
                  <Search className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                  {searchQuery || searchModuleId !== "all" || searchStatus !== "all" ? (
                    <>
                      <p className="text-amber-900 font-bold text-sm">No se encontraron preguntas coincidentes.</p>
                      <p className="text-slate-500 text-xs mt-1">Pruebe utilizando palabras clave más simples o limpie los filtros.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-amber-900 font-bold text-sm">Banco de Preguntas listo</p>
                      <p className="text-slate-500 text-xs mt-1">Escriba una consulta arriba para buscar de forma inmediata en las 480 preguntas.</p>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="text-xs text-amber-500 font-extrabold font-mono tracking-widest uppercase block mb-1">
              Plataforma Educativa para Docentes ITT
            </span>
            <p className="text-slate-200 text-sm font-bold font-display">
              Banco de Preguntas, Personal Directivo y Docentes ITT
            </p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">
              Diseñado exclusivamente para el autoestudio, capacitación y preparación pedagógica de profesionales de educación técnica superior en Bolivia.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
            <span className="text-xs text-slate-500">
              Formato de datos: 480 preguntas en 16 módulos interactivos.
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Hecho con React, TypeScript, Tailwind CSS y Web Speech API.
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
