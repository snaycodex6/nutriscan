import React, { useState, useRef, useEffect } from 'react';
import { Camera, Apple, Zap, Activity, ChevronRight, AlertCircle, CheckCircle2, User, Clock, ChevronLeft, Target, TrendingUp, ArrowLeft, Sparkles, Search, Info } from 'lucide-react';

// --- Configuration ---
const apiKey = ""; 
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

const App = () => {
  const [activeTab, setActiveTab] = useState('scanner');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const [history, setHistory] = useState([
    { 
      id: 1, 
      date: 'Aujourd\'hui, 08:30', 
      name: 'Bowl Acai & Fruits', 
      totalCalories: 380, 
      healthScore: 9, 
      healthLabel: 'Excellent', 
      image: null,
      foods: [
        { name: 'Baies d\'Acai', portion: '150g', calories: 120, protein: 2, carbs: 15, fat: 8 },
        { name: 'Granola', portion: '40g', calories: 180, protein: 4, carbs: 22, fat: 10 },
        { name: 'Banane', portion: '1/2', calories: 80, protein: 1, carbs: 20, fat: 0 }
      ],
      analysis: "Un repas riche en antioxydants et en fibres.",
      recommendation: "Parfait pour l'énergie matinale."
    }
  ]);

  const [image, setImage] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const loadingMessages = [
    "Initialisation de l'optique...",
    "Détection des textures alimentaires...",
    "Estimation des volumes par IA...",
    "Calcul des densités caloriques...",
    "Évaluation du score nutritionnel..."
  ];

  useEffect(() => {
    setSelectedHistoryItem(null);
  }, [activeTab]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const callGeminiWithRetry = async (prompt, base64Data, retries = 5, delay = 1000) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType: "image/png", data: base64Data } }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            foods: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  portion: { type: "STRING" },
                  calories: { type: "NUMBER" },
                  protein: { type: "NUMBER" },
                  carbs: { type: "NUMBER" },
                  fat: { type: "NUMBER" }
                },
                required: ["name", "calories"]
              }
            },
            totalCalories: { type: "NUMBER" },
            healthScore: { type: "NUMBER" },
            healthLabel: { type: "STRING" },
            analysis: { type: "STRING" },
            recommendation: { type: "STRING" }
          },
          required: ["foods", "totalCalories", "healthScore", "healthLabel", "analysis", "recommendation"]
        }
      }
    };

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`HTTP error!`);
        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) return JSON.parse(textResponse);
        throw new Error("Empty response");
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
        setBase64Image(reader.result.split(',')[1]);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePlate = async () => {
    if (!base64Image) return;
    setLoading(true);
    setError(null);
    try {
      const res = await callGeminiWithRetry("Analyze plate. French response.", base64Image);
      setResult(res);
      setHistory([{ ...res, id: Date.now(), date: 'À l\'instant', image: image, name: res.foods[0]?.name || "Repas" }, ...history]);
    } catch (err) {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-emerald-500';
    if (score >= 6) return 'text-sky-500';
    if (score >= 4) return 'text-amber-500';
    return 'text-rose-500';
  };

  // --- UI Components ---

  const ScanningOverlay = () => (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Laser Beam */}
      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
      
      {/* Glitch/Grid effect */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:20px_20px]" />
      
      {/* Corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
      
      {/* Processing indicator */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-black/40 backdrop-blur-md p-6 rounded-full aspect-square justify-center border border-white/10 animate-pulse">
        <Search className="w-8 h-8 text-emerald-400 animate-bounce" />
      </div>
    </div>
  );

  const MealDetails = ({ data, onBack }) => (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-xs mb-2 transition-colors hover:text-emerald-500">
          <ArrowLeft className="w-4 h-4" /> RETOUR
        </button>
      )}

      {data.image && (
        <div className="rounded-[2.5rem] overflow-hidden h-56 w-full shadow-2xl shadow-emerald-900/10 border border-white relative group">
          <img src={data.image} alt="Repas" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white text-xs font-bold">
            <Sparkles className="w-3 h-3 fill-white" /> ANALYSE IA CERTIFIÉE
          </div>
        </div>
      )}

      {/* Main Score Card with Glassmorphism */}
      <div className={`p-8 rounded-[2.5rem] border-2 shadow-xl overflow-hidden relative ${data.healthScore >= 8 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/40 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Qualité Nutritionnelle</h2>
              <div className={`text-4xl font-black tracking-tight ${getScoreColor(data.healthScore)}`}>{data.healthLabel}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-inner border border-slate-100 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${getScoreColor(data.healthScore)}`}>{data.healthScore}</span>
                <span className="text-[8px] font-bold text-slate-400 mt-[-4px]">SUR 10</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/90 p-4 rounded-3xl shadow-sm border border-slate-50">
              <span className="block text-[10px] uppercase font-black text-slate-400 mb-1">Énergie</span>
              <span className="text-xl font-black text-slate-800 tracking-tight">{data.totalCalories} <span className="text-xs font-bold opacity-40">KCAL</span></span>
            </div>
            <div className="bg-white/90 p-4 rounded-3xl shadow-sm border border-slate-50">
              <span className="block text-[10px] uppercase font-black text-slate-400 mb-1">Date</span>
              <span className="text-xs font-bold text-slate-600 block mt-1">{data.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Intelligence Box */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-4 h-4 fill-emerald-400" /> Intelligence NutriScan
          </div>
          <p className="text-slate-300 text-sm leading-relaxed font-medium">{data.analysis}</p>
          <div className="h-px bg-white/10 w-full" />
          <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <Info className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-sm italic text-slate-200">"{data.recommendation}"</p>
          </div>
        </div>
      </div>

      {/* Ingredients List with Staggered Appearance */}
      <div className="space-y-3">
        <h3 className="px-2 text-xs font-black uppercase tracking-widest text-slate-400">Composition Analysée</h3>
        {data.foods.map((food, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                    {i % 2 === 0 ? '🥑' : '🍛'}
                </div>
                <div>
                    <div className="font-bold text-slate-800 text-base">{food.name}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{food.portion}</div>
                </div>
            </div>
            <div className="text-right">
                <div className="font-black text-slate-900 text-lg">{food.calories} <span className="text-xs font-normal text-slate-300">kcal</span></div>
                <div className="flex gap-2 text-[9px] font-black text-slate-400 uppercase">
                  <span className="text-emerald-500/70">P {food.protein}g</span>
                  <span className="text-sky-500/70">G {food.carbs}g</span>
                  <span className="text-rose-500/70">L {food.fat}g</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-24 selection:bg-emerald-100 selection:text-emerald-900">
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10%, 90% { opacity: 1; }
          50% { top: 100%; }
        }
      `}</style>
      
      {/* Dynamic Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-30 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2.5 rounded-[1rem] shadow-lg shadow-emerald-200 rotate-3">
            <Apple className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight leading-none">NutriScan <span className="text-emerald-500">AI</span></h1>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 italic">Intelligence Biométrique</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="bg-slate-100 h-8 w-8 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-slate-400" />
            </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 mt-8">
        {activeTab === 'scanner' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <section className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden relative group">
              {!image ? (
                <div onClick={() => fileInputRef.current?.click()} className="py-24 px-10 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/50 transition-all active:scale-[0.98]">
                  <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                    <Camera className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-black mb-2 text-center text-slate-800">Prêt pour le scan ?</h3>
                  <p className="text-slate-400 text-center text-sm font-medium max-w-[200px]">Prenez une photo nette de votre assiette pour l'IA.</p>
                </div>
              ) : (
                <div className="relative aspect-square sm:aspect-video md:aspect-square bg-slate-900">
                  <img src={image} alt="Repas" className={`w-full h-full object-cover transition-all duration-1000 ${loading ? 'opacity-70 scale-110 blur-[2px]' : ''}`} />
                  {loading && <ScanningOverlay />}
                  {!result && !loading && (
                    <button onClick={() => setImage(null)} className="absolute top-6 left-6 bg-black/40 backdrop-blur-xl text-white p-3 rounded-2xl hover:bg-black/60 transition-colors border border-white/10 shadow-lg"><ChevronLeft className="w-6 h-6" /></button>
                  )}
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" className="hidden" />
            </section>

            {image && !result && !loading && (
              <button onClick={analyzePlate} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-slate-400/20 flex items-center justify-center gap-3 transition-all active:scale-95 group">
                <Zap className="w-6 h-6 fill-emerald-400 text-emerald-400 group-hover:animate-bounce" /> ANALYSER L'ASSIETTE
              </button>
            )}

            {loading && (
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center space-y-6 shadow-xl animate-pulse">
                <div className="flex gap-2">
                    {[0, 1, 2].map(i => <div key={i} className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
                </div>
                <div className="text-center space-y-1">
                  <p className="font-black text-slate-800 uppercase tracking-widest text-xs">Traitement Neural en cours</p>
                  <p className="text-sm font-bold text-emerald-500 h-5 transition-all duration-500">{loadingMessages[loadingStep]}</p>
                </div>
              </div>
            )}

            {result && <MealDetails data={result} onBack={() => { setImage(null); setResult(null); }} />}
          </div>
        )}

        {activeTab === 'historique' && (
          <div className="space-y-5 animate-in fade-in duration-500">
            {selectedHistoryItem ? (
                <MealDetails data={selectedHistoryItem} onBack={() => setSelectedHistoryItem(null)} />
            ) : (
                <>
                <div className="flex justify-between items-end mb-4 px-2">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">Historique</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suivi de vos nutriments</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full">{history.length} ENTRÉES</span>
                </div>
                <div className="space-y-4">
                    {history.map((item, idx) => (
                        <div key={item.id} onClick={() => setSelectedHistoryItem(item)} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex items-center gap-5 hover:border-emerald-200 cursor-pointer transition-all shadow-sm active:scale-[0.97] group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-50 relative">
                                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Apple className="text-slate-200 w-8 h-8" /></div>}
                                <div className={`absolute inset-0 opacity-10 ${getScoreColor(item.healthScore).replace('text', 'bg')}`} />
                            </div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{item.date}</span>
                                    <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${getScoreColor(item.healthScore)} ${getScoreColor(item.healthScore).replace('text', 'bg').replace('500', '50')}`}>
                                        {item.healthLabel}
                                    </div>
                                </div>
                                <h4 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors line-clamp-1">{item.name}</h4>
                                <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" /> {item.totalCalories} kcal
                                </div>
                            </div>
                            <ChevronRight className="text-slate-200 w-6 h-6 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    ))}
                </div>
                </>
            )}
          </div>
        )}

        {activeTab === 'profil' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[3rem] border border-white text-center shadow-2xl shadow-slate-200/50 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-sky-400" />
              <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-xl rotate-3">JD</div>
                <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-2xl shadow-lg border border-slate-50">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Jean Dupont</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Utilisateur Certifié</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
                  <Target className="text-emerald-400 w-5 h-5" />
                </div>
                <span className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Objectif Hebdo</span>
                <span className="text-2xl font-black tracking-tight">92<span className="text-xs opacity-40 ml-1">%</span></span>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="text-emerald-500 w-5 h-5" />
                </div>
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne Santé</span>
                <span className="text-2xl font-black text-slate-800 tracking-tight">8.2<span className="text-xs opacity-30 ml-1">/10</span></span>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-2">
              {['Objectifs Nutritionnels', 'Préférences IA', 'Exporter ma Santé'].map((item, i) => (
                <button key={i} className="w-full px-6 py-5 flex justify-between items-center rounded-2xl hover:bg-slate-50 transition-all group">
                  <span className="font-bold text-slate-700 group-hover:translate-x-1 transition-transform">{item}</span>
                  <div className="bg-slate-50 p-2 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Futuristic Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-50">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/50 px-8 py-3 rounded-[2.5rem] flex justify-between items-center shadow-2xl shadow-slate-900/10">
            <button onClick={() => setActiveTab('historique')} className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'historique' ? 'text-emerald-500 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
                <Clock className={`w-6 h-6 ${activeTab === 'historique' ? 'fill-emerald-100' : ''}`} strokeWidth={activeTab === 'historique' ? 3 : 2} />
                <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Historique</span>
            </button>
            
            <button onClick={() => setActiveTab('scanner')} className={`relative -top-8 p-1 rounded-full transition-transform active:scale-90 ${activeTab === 'scanner' ? 'scale-110' : ''}`}>
                <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl shadow-emerald-500/30">
                    <Camera className="w-7 h-7" strokeWidth={3} />
                </div>
                {activeTab === 'scanner' && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
            </button>

            <button onClick={() => setActiveTab('profil')} className={`flex flex-col items-center transition-all duration-300 ${activeTab === 'profil' ? 'text-emerald-500 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
                <User className={`w-6 h-6 ${activeTab === 'profil' ? 'fill-emerald-100' : ''}`} strokeWidth={activeTab === 'profil' ? 3 : 2} />
                <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Compte</span>
            </button>
        </div>
      </nav>
    </div>
  );
};

export default App;