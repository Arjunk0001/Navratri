import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Search,
  Flame,
  Volume2,
  Copy,
  Check,
  ChevronRight,
  Clock,
  Heart,
  Calendar,
  Share2,
  HelpCircle,
  Flower2,
  Sun,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ritualsList, RitualItem } from '../data/ritualsData';
import { playTempleBell, playShankhDhwani } from '../utils/audio';

interface RitualGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDarshan?: () => void;
  initialRitualId?: string;
}

export const RitualGuideModal: React.FC<RitualGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenDarshan,
  initialRitualId,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRitualId, setSelectedRitualId] = useState<string>(
    initialRitualId || ritualsList[0].id
  );
  const [activeStepTab, setActiveStepTab] = useState<number>(0);
  const [copiedMantra, setCopiedMantra] = useState<boolean>(false);
  const [languageMode, setLanguageMode] = useState<'dual' | 'hindi' | 'english'>('dual');
  const [flowers, setFlowers] = useState<{ id: number; left: number; delay: number }[]>([]);
  const [ritualOfferings, setRitualOfferings] = useState<Record<string, number>>({});
  const [litDiyas, setLitDiyas] = useState<Record<string, boolean>>({});

  // Filtered rituals list based on day tab & search query
  const filteredRituals = useMemo(() => {
    return ritualsList.filter((item) => {
      const matchesDay =
        selectedDayFilter === 'all' ||
        item.day.toLowerCase() === selectedDayFilter.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesDay;

      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.hindiName.toLowerCase().includes(q) ||
        item.dayHindi.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.significance.toLowerCase().includes(q) ||
        item.significanceHindi.toLowerCase().includes(q) ||
        item.keySamagri.some((s) => s.toLowerCase().includes(q)) ||
        item.steps.some(
          (st) =>
            st.title.toLowerCase().includes(q) ||
            st.hindiTitle.toLowerCase().includes(q) ||
            st.description.toLowerCase().includes(q)
        );

      return matchesDay && matchesSearch;
    });
  }, [selectedDayFilter, searchQuery]);

  // Selected active ritual
  const activeRitual: RitualItem = useMemo(() => {
    const found = ritualsList.find((r) => r.id === selectedRitualId);
    return found || filteredRituals[0] || ritualsList[0];
  }, [selectedRitualId, filteredRituals]);

  if (!isOpen) return null;

  const handleSelectRitual = (id: string) => {
    playTempleBell();
    setSelectedRitualId(id);
    setActiveStepTab(0);
  };

  const handleCopyMantra = () => {
    playTempleBell();
    const textToCopy = `${activeRitual.sacredMantra.sanskrit}\n${activeRitual.sacredMantra.transliteration}\nMeaning: ${activeRitual.sacredMantra.meaning}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedMantra(true);
    setTimeout(() => setCopiedMantra(false), 2200);
  };

  const handleOfferFlower = (ritualId: string) => {
    playTempleBell();
    setRitualOfferings((prev) => ({
      ...prev,
      [ritualId]: (prev[ritualId] || 0) + 1,
    }));

    // Floating flower petals
    const newPetals = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      left: 15 + Math.random() * 70,
      delay: Math.random() * 0.4,
    }));
    setFlowers(newPetals);
    setTimeout(() => setFlowers([]), 2500);
  };

  const handleToggleDiya = (ritualId: string) => {
    playTempleBell();
    setLitDiyas((prev) => ({
      ...prev,
      [ritualId]: !prev[ritualId],
    }));
  };

  const dayTabs = [
    { id: 'all', label: 'All Rituals', hindi: 'सभी विधि' },
    { id: 'mahalaya', label: 'Mahalaya', hindi: 'महालया' },
    { id: 'sasthi', label: 'Sasthi', hindi: 'महाषष्ठी' },
    { id: 'saptami', label: 'Saptami', hindi: 'महासप्तमी' },
    { id: 'ashtami', label: 'Ashtami', hindi: 'महाष्टमी' },
    { id: 'sandhi puja', label: 'Sandhi Puja', hindi: 'संधि पूजा' },
    { id: 'navami', label: 'Navami', hindi: 'महानवमी' },
    { id: 'dashami', label: 'Dashami', hindi: 'विजयादशमी' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#340505] via-[#220303] to-[#140101] border border-[#ffd76a]/60 shadow-[0_0_50px_rgba(217,164,65,0.25)] flex flex-col max-h-[94vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Flower Petals Effect */}
        {flowers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {flowers.map((flower) => (
              <div
                key={flower.id}
                style={{
                  left: `${flower.left}%`,
                  animationDelay: `${flower.delay}s`,
                }}
                className="absolute bottom-10 animate-[float-sparkle_2.4s_ease-out_forwards] text-lg sm:text-2xl select-none"
              >
                🌺
              </div>
            ))}
          </div>
        )}

        {/* TOP HEADER */}
        <div className="p-4 sm:p-5 border-b border-[#d9a441]/30 bg-gradient-to-r from-[#400707] via-[#2d0404] to-[#400707] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#d97706] to-[#78350f] border border-[#ffd76a]/50 flex items-center justify-center shadow-lg text-xl sm:text-2xl">
                🪷
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-marcellus text-lg sm:text-2xl font-bold text-[#fff4d1] tracking-wide">
                    दुर्गा पूजा विधि एवं तात्विक महत्व
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[#ffd76a] border border-[#ffd76a]/30 text-[10px] font-semibold">
                    Step-by-Step Ritual Guide
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-[#ffd76a]/85 font-hindi">
                  सम्पूर्ण पूजा विधान, शास्त्रोक्त महत्व, 108 दीप, पुष्पांजलि व मंत्र संदर्भ
                </p>
              </div>
            </div>

            {/* Quick Actions & Close Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playShankhDhwani();
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#590a0a]/80 hover:bg-[#7a0f0f] text-[#ffd76a] border border-[#ffd76a]/30 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm"
                title="Play Sacred Conch (शंख ध्वनि)"
              >
                <span>🐚</span>
                <span className="text-[11px]">शंखनाद</span>
              </button>

              <button
                onClick={() => {
                  playTempleBell();
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#590a0a]/80 hover:bg-[#7a0f0f] text-[#ffd76a] border border-[#ffd76a]/30 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm"
                title="Ring Temple Bell (घंटा नाद)"
              >
                <span>🔔</span>
                <span className="text-[11px]">घंटा नाद</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/40 hover:bg-black/70 text-[#ffd76a] transition-all cursor-pointer border border-[#ffd76a]/40"
                aria-label="Close Ritual Guide"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls Bar: Search + Language Selection */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#ffd76a]/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rituals (e.g. Pushpanjali, 108 Diya, Sindoor, हवन, बोधन)..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-[#d9a441]/35 text-xs text-[#fff4d1] placeholder-[#ffd76a]/40 focus:outline-none focus:border-[#ffd76a]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#ffd76a]/60 hover:text-[#ffd76a]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Language view toggles */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-[#d9a441]/30 self-end sm:self-auto text-[11px]">
              <button
                onClick={() => setLanguageMode('dual')}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                  languageMode === 'dual'
                    ? 'bg-[#d9a441] text-[#2a0404] font-bold shadow-sm'
                    : 'text-[#ecd6b3] hover:text-[#ffd76a]'
                }`}
              >
                Dual (द्विभाषी)
              </button>
              <button
                onClick={() => setLanguageMode('hindi')}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                  languageMode === 'hindi'
                    ? 'bg-[#d9a441] text-[#2a0404] font-bold shadow-sm'
                    : 'text-[#ecd6b3] hover:text-[#ffd76a]'
                }`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLanguageMode('english')}
                className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                  languageMode === 'english'
                    ? 'bg-[#d9a441] text-[#2a0404] font-bold shadow-sm'
                    : 'text-[#ecd6b3] hover:text-[#ffd76a]'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* DAY FILTER CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs">
            {dayTabs.map((tab) => {
              const isActive = selectedDayFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    playTempleBell();
                    setSelectedDayFilter(tab.id);
                  }}
                  className={`px-3 py-1 rounded-lg shrink-0 transition-all font-medium flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#d97706] to-[#b45309] text-white border border-[#ffd76a] shadow-sm font-semibold'
                      : 'bg-black/30 hover:bg-black/50 text-[#e6d0af] border border-[#d9a441]/20'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="opacity-75 text-[10px]">({tab.hindi})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN BODY: 2-COLUMN LAYOUT ON DESKTOP, STACKED ON MOBILE */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT COLUMN: RITUALS LIST / SELECTOR (4 COLS) */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#d9a441]/25 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-2.5 bg-black/20 max-h-[220px] lg:max-h-none">
            <div className="text-[11px] font-semibold text-[#ffd76a] uppercase tracking-wider px-1 flex items-center justify-between">
              <span>Devotional Timeline ({filteredRituals.length})</span>
              <span className="text-[10px] text-[#e6d0af]/70">क्रमबद्ध अनुष्ठान</span>
            </div>

            {filteredRituals.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#e6d0af]/70 space-y-1">
                <p>कोई अनुष्ठान नहीं मिला</p>
                <p>No ritual matches "{searchQuery}"</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDayFilter('all');
                  }}
                  className="mt-2 text-xs text-[#ffd76a] underline"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              filteredRituals.map((ritual) => {
                const isSelected = activeRitual.id === ritual.id;
                const isDiyaOn = litDiyas[ritual.id];
                const offeringCount = ritualOfferings[ritual.id] || 0;

                return (
                  <button
                    key={ritual.id}
                    onClick={() => handleSelectRitual(ritual.id)}
                    className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer relative border ${
                      isSelected
                        ? `bg-gradient-to-r ${ritual.colorTheme.gradient} border-[#ffd76a] shadow-[0_0_18px_${ritual.colorTheme.glow}]`
                        : 'bg-[#2a0404]/60 hover:bg-[#3a0606] border-[#d9a441]/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs px-2 py-0.2 rounded-full bg-black/40 text-[#ffd76a] font-semibold border border-[#ffd76a]/20">
                            {ritual.dayHindi}
                          </span>
                          {ritual.badgeText && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-600/80 text-white font-medium">
                              {ritual.badgeText}
                            </span>
                          )}
                        </div>

                        <h4 className="font-marcellus text-sm font-bold text-[#fff7e6] truncate">
                          {languageMode === 'english' ? ritual.name : ritual.hindiName}
                        </h4>
                        {languageMode === 'dual' && (
                          <p className="text-[11px] text-[#ffd76a]/80 truncate">
                            {ritual.name}
                          </p>
                        )}
                        <p className="text-[10px] text-[#e8d5b5]/80 flex items-center gap-1 mt-1 truncate">
                          <Clock className="w-3 h-3 text-[#ffd76a] shrink-0" />
                          <span>{ritual.timings}</span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            isSelected ? 'text-[#ffd76a] translate-x-0.5' : 'text-[#ffd76a]/40'
                          }`}
                        />
                        {(isDiyaOn || offeringCount > 0) && (
                          <div className="flex items-center gap-1 text-[10px] text-[#ffd76a] mt-2">
                            {isDiyaOn && <span>🪔</span>}
                            {offeringCount > 0 && <span>🌺 {offeringCount}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: RITUAL DETAILS (8 COLS) */}
          <div className="lg:col-span-8 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-5 bg-gradient-to-b from-transparent to-black/30">
            {/* RITUAL TITLE CARD */}
            <div
              className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${activeRitual.colorTheme.gradient} border ${activeRitual.colorTheme.border} shadow-lg relative overflow-hidden`}
            >
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-radial from-white/10 to-transparent blur-2xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-[#ffd76a]/40 text-[#ffd76a] text-xs font-bold">
                      {activeRitual.dayHindi}
                    </span>
                    <span className="text-xs text-[#fff4d1]/80 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#ffd76a]" />
                      <span>{activeRitual.timings}</span>
                    </span>
                  </div>

                  <h3 className="font-marcellus text-xl sm:text-2xl font-bold text-white tracking-wide">
                    {activeRitual.hindiName}
                  </h3>
                  <p className="text-sm font-cinzel text-[#ffd76a] font-semibold">
                    {activeRitual.name}
                  </p>
                  <p className="text-xs text-[#fed7aa] mt-1 italic">
                    "{activeRitual.tagline}"
                  </p>
                </div>

                {/* Interactive Devotional Offering Panel */}
                <div className="flex sm:flex-col items-center gap-2 shrink-0 bg-black/30 p-2.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => handleOfferFlower(activeRitual.id)}
                    className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-sm"
                    title="Offer Virtual Hibiscus (पुष्पांजलि अर्पित करें)"
                  >
                    <span>🌺</span>
                    <span>पुष्प अर्पण</span>
                    {ritualOfferings[activeRitual.id] ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                        {ritualOfferings[activeRitual.id]}
                      </span>
                    ) : null}
                  </button>

                  <button
                    onClick={() => handleToggleDiya(activeRitual.id)}
                    className={`flex-1 sm:w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-all border ${
                      litDiyas[activeRitual.id]
                        ? 'bg-amber-500 text-black border-amber-300 font-bold shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : 'bg-black/40 text-[#ffd76a] hover:bg-black/60 border-[#ffd76a]/30'
                    }`}
                    title="Light Sacred Diya (दीप प्रज्वलित करें)"
                  >
                    <Flame className={`w-3.5 h-3.5 ${litDiyas[activeRitual.id] ? 'animate-flame text-amber-900' : 'text-amber-400'}`} />
                    <span>{litDiyas[activeRitual.id] ? 'दीपक प्रज्वलित है' : 'दीप जलाएं'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SPIRITUAL SIGNIFICANCE & CULTURAL STORY */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#2a0404]/60 border border-[#d9a441]/30 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#d9a441]/20">
                <Sun className="w-4 h-4 text-[#ffd76a]" />
                <h4 className="font-marcellus text-sm sm:text-base font-bold text-[#ffd76a] tracking-wide">
                  Spiritual Significance (तात्विक एवं आध्यात्मिक महत्व)
                </h4>
              </div>

              {/* Bilingual description */}
              {(languageMode === 'dual' || languageMode === 'hindi') && (
                <div className="text-xs sm:text-sm text-[#fdf6e7] font-hindi leading-relaxed bg-[#3d0707]/40 p-3 rounded-xl border border-[#d9a441]/20">
                  <p>{activeRitual.significanceHindi}</p>
                </div>
              )}

              {(languageMode === 'dual' || languageMode === 'english') && (
                <div className="text-xs sm:text-sm text-[#e6d0af] leading-relaxed">
                  <p>{activeRitual.significance}</p>
                </div>
              )}

              {/* Cultural Folklore insight */}
              <div className="p-3 rounded-xl bg-black/40 border border-[#ffd76a]/20 text-xs text-[#eddcb9] space-y-1">
                <span className="text-[10px] text-[#ffd76a] font-bold uppercase tracking-wider block">
                  📜 पौराणिक कथा एवं ऐतिहासिक परंपरा (Folklore & Heritage)
                </span>
                <p className="text-[11px] sm:text-xs italic leading-relaxed text-[#f3e5ca]">
                  {activeRitual.culturalBackground}
                </p>
              </div>
            </div>

            {/* STEP-BY-STEP RITUAL PROCEDURE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#2a0404]/60 border border-[#d9a441]/30 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#d9a441]/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#ffd76a]" />
                  <h4 className="font-marcellus text-sm sm:text-base font-bold text-[#ffd76a] tracking-wide">
                    Step-by-Step Procedure (क्रमबद्ध विधि विधान)
                  </h4>
                </div>
                <span className="text-[10px] text-[#ffd76a]/80 font-medium">
                  {activeRitual.steps.length} Sacred Steps
                </span>
              </div>

              {/* Step indicator tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {activeRitual.steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      playTempleBell();
                      setActiveStepTab(idx);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                      activeStepTab === idx
                        ? 'bg-[#d9a441] text-[#2a0404] font-bold shadow-md'
                        : 'bg-black/30 hover:bg-black/60 text-[#ffd76a]/80 border border-[#d9a441]/20'
                    }`}
                  >
                    <span>Step {step.stepNumber}</span>
                  </button>
                ))}
              </div>

              {/* Active Step Content Card */}
              {activeRitual.steps[activeStepTab] && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#3b0606] to-[#250303] border border-[#ffd76a]/40 shadow-inner space-y-2.5">
                  <div className="flex items-center gap-2 text-[#ffd76a]">
                    <span className="w-6 h-6 rounded-full bg-[#d9a441] text-[#2a0404] font-bold text-xs flex items-center justify-center">
                      {activeRitual.steps[activeStepTab].stepNumber}
                    </span>
                    <h5 className="font-marcellus text-sm sm:text-base font-bold text-[#fff4d1]">
                      {languageMode === 'english'
                        ? activeRitual.steps[activeStepTab].title
                        : activeRitual.steps[activeStepTab].hindiTitle}
                    </h5>
                    {languageMode === 'dual' && (
                      <span className="text-xs text-[#ffd76a]/80 italic">
                        ({activeRitual.steps[activeStepTab].title})
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#ecd6b3] leading-relaxed pl-8">
                    {activeRitual.steps[activeStepTab].description}
                  </p>

                  {activeRitual.steps[activeStepTab].actionGuidance && (
                    <div className="ml-8 p-2.5 rounded-lg bg-black/40 border-l-2 border-[#ffd76a] text-[11px] sm:text-xs text-[#fed7aa] flex items-start gap-2">
                      <span className="text-xs">💡</span>
                      <div>
                        <span className="font-semibold text-[#ffd76a]">भक्त सहभागिता: </span>
                        <span>{activeRitual.steps[activeStepTab].actionGuidance}</span>
                      </div>
                    </div>
                  )}

                  {/* Stepper Navigation buttons */}
                  <div className="flex items-center justify-between pt-2 pl-8">
                    <button
                      disabled={activeStepTab === 0}
                      onClick={() => setActiveStepTab((prev) => Math.max(0, prev - 1))}
                      className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50 disabled:opacity-30 disabled:pointer-events-none text-xs text-[#ffd76a] cursor-pointer"
                    >
                      ← Previous Step
                    </button>
                    <span className="text-[11px] text-[#ffd76a]/60">
                      Step {activeStepTab + 1} of {activeRitual.steps.length}
                    </span>
                    <button
                      disabled={activeStepTab === activeRitual.steps.length - 1}
                      onClick={() =>
                        setActiveStepTab((prev) =>
                          Math.min(activeRitual.steps.length - 1, prev + 1)
                        )
                      }
                      className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/50 disabled:opacity-30 disabled:pointer-events-none text-xs text-[#ffd76a] cursor-pointer"
                    >
                      Next Step →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SACRED MANTRA & SHLOKA CARD */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#400707] via-[#2f0404] to-[#200303] border border-[#ffd76a]/50 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#ffd76a]/20">
                <div className="flex items-center gap-2">
                  <span className="text-base">🕉️</span>
                  <h4 className="font-marcellus text-sm sm:text-base font-bold text-[#ffd76a] tracking-wide">
                    Sacred Chanting Mantra (महामंत्र व ध्यान श्लोक)
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playTempleBell();
                      playShankhDhwani();
                    }}
                    className="p-1.5 rounded-lg bg-black/40 hover:bg-black/70 text-[#ffd76a] border border-[#ffd76a]/30 text-xs flex items-center gap-1 cursor-pointer transition-all"
                    title="Listen to Conch & Bell"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">ध्वनि</span>
                  </button>

                  <button
                    onClick={handleCopyMantra}
                    className="px-2.5 py-1 rounded-lg bg-[#d9a441]/20 hover:bg-[#d9a441]/40 text-[#ffd76a] border border-[#ffd76a]/40 text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    {copiedMantra ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copy Mantra</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sanskrit Text */}
              <div className="p-3.5 rounded-xl bg-black/50 border border-[#ffd76a]/30 text-center space-y-2">
                <p className="font-hindi text-base sm:text-lg font-bold text-[#fff4d1] leading-relaxed drop-shadow-sm">
                  {activeRitual.sacredMantra.sanskrit}
                </p>
                <p className="text-[11px] sm:text-xs text-[#fed7aa] font-mono tracking-wide opacity-90">
                  {activeRitual.sacredMantra.transliteration}
                </p>
              </div>

              {/* English & Hindi Meaning */}
              <div className="text-xs text-[#ebd7b9] space-y-1 bg-black/20 p-2.5 rounded-xl">
                <span className="text-[10px] text-[#ffd76a] font-bold uppercase tracking-wider block">
                  Meaning (मंत्र का भावार्थ):
                </span>
                <p className="italic text-[11px] sm:text-xs leading-relaxed text-[#f7e6ca]">
                  "{activeRitual.sacredMantra.meaning}"
                </p>
              </div>
            </div>

            {/* KEY AUSPICIOUS SAMAGRI & DEVOTEE PARTICIPATION TIPS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Key Samagri */}
              <div className="p-4 rounded-2xl bg-[#2a0404]/60 border border-[#d9a441]/30 space-y-2.5">
                <div className="flex items-center gap-2 text-[#ffd76a] pb-1.5 border-b border-[#d9a441]/20">
                  <Flower2 className="w-4 h-4" />
                  <h5 className="font-marcellus text-xs sm:text-sm font-bold">
                    Key Sacred Samagri (आवश्यक पूजा सामग्री)
                  </h5>
                </div>
                <ul className="space-y-1.5 text-xs text-[#ecd6b3]">
                  {activeRitual.keySamagri.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d9a441] shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Devotee tips */}
              <div className="p-4 rounded-2xl bg-[#2a0404]/60 border border-[#d9a441]/30 space-y-2.5">
                <div className="flex items-center gap-2 text-[#ffd76a] pb-1.5 border-b border-[#d9a441]/20">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <h5 className="font-marcellus text-xs sm:text-sm font-bold">
                    Devotee Guidance (भक्तों हेतु दिशा-निर्देश)
                  </h5>
                </div>
                <ul className="space-y-1.5 text-xs text-[#ecd6b3]">
                  {activeRitual.devoteeParticipationTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#ffd76a] shrink-0 mt-0.5">✦</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3 sm:p-4 border-t border-[#d9a441]/30 bg-[#240303] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#e6d0af] text-center sm:text-left">
            <span className="text-base">🪷</span>
            <span>
              Shree Shakti Durga Puja Samiti • Traditional Vedic & Tantric Puja Heritage
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenDarshan && (
              <button
                onClick={() => {
                  onClose();
                  onOpenDarshan();
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#d97706] to-[#b45309] text-white font-semibold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Live Darshan देखें</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 text-[#ffd76a] border border-[#ffd76a]/30 font-medium transition-all cursor-pointer text-center"
            >
              बंद करें (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
