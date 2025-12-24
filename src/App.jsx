import React, { useState, useRef, useEffect } from 'react';
import { Camera, Apple, Zap, Activity, ChevronRight, AlertCircle, CheckCircle2, User, Clock, ChevronLeft, Target, TrendingUp, ArrowLeft, Sparkles, Search, Info, BarChart3, Settings, Heart } from 'lucide-react';

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
    "Analyse des textures...",
    "Détection des ingrédients...",
    "Calcul nutritionnel...",
    "Évaluation santé..."
  ];

  useEffect(() => {
    setSelectedHistoryItem(null);
  }, [activeTab]);

  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 1200);
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
    if (score >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 6) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 4) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreGradient = (score) => {
    if (score >= 8) return 'from-emerald-500 to-green-500';
    if (score >= 6) return 'from-blue-500 to-cyan-500';
    if (score >= 4) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  // --- UI Components ---

  const ScanningOverlay = () => (
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-blue-500/10 to-purple-500/20 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <p className="text-white font-semibold text-sm">{loadingMessages[loadingStep]}</p>
      </div>
    </div>
  );

  const MealDetails = ({ data, onBack }) => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors p-2 -ml-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Retour</span>
        </button>
      )}

      {/* Score principal */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Score nutritionnel</h2>
            <p className="text-sm text-slate-600">Évaluation globale</p>
          </div>
          <div className={`px-4 py-2 rounded-xl border-2 ${getScoreColor(data.healthScore)}`}>
            <div className="text-2xl font-bold">{data.healthScore}/10</div>
            <div className="text-xs font-medium">{data.healthLabel}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{data.totalCalories}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Calories</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-600">{data.date}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Analysé</div>
          </div>
        </div>
      </div>

      {/* Analyse IA */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold">Analyse intelligente</h3>
        </div>
        <p className="text-slate-300 mb-4 leading-relaxed">{data.analysis}</p>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-white mb-1">Recommandation</div>
              <p className="text-slate-200 text-sm">{data.recommendation}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ingrédients */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 px-1">Composition détaillée</h3>
        {data.foods.map((food, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🥗</span>
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{food.name}</div>
                  <div className="text-sm text-slate-500">{food.portion}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900">{food.calories} kcal</div>
                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                  <span>P {food.protein}g</span>
                  <span>G {food.carbs}g</span>
                  <span>L {food.fat}g</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-900">
      
      {/* Header moderne */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <Apple className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">NutriScan</h1>
              <p className="text-xs text-slate-500">IA Nutritionnelle</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8 pb-24">
        {activeTab === 'scanner' && (
          <div className="space-y-6">
            {/* Zone de capture */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {!image ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
                    <Camera className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-center">Scanner un repas</h3>
                  <p className="text-slate-600 text-center text-sm max-w-xs">
                    Prenez une photo de votre assiette pour une analyse nutritionnelle instantanée
                  </p>
                </div>
              ) : (
                <div className="relative aspect-square bg-slate-900 rounded-2xl overflow-hidden">
                  <img
                    src={image}
                    alt="Repas"
                    className={`w-full h-full object-cover transition-all duration-500 ${loading ? 'opacity-50 scale-105 blur-sm' : ''}`}
                  />
                  {loading && <ScanningOverlay />}
                  {!result && !loading && (
                    <button
                      onClick={() => setImage(null)}
                      className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-700 p-2 rounded-xl hover:bg-white transition-colors shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                capture="environment"
                className="hidden"
              />
            </div>

            {/* Bouton d'analyse */}
            {image && !result && !loading && (
              <button
                onClick={analyzePlate}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold py-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Zap className="w-5 h-5" />
                Analyser le repas
              </button>
            )}

            {/* État de chargement */}
            {loading && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <div className="text-center space-y-4">
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Analyse en cours...</p>
                    <p className="text-sm text-emerald-600 mt-1">{loadingMessages[loadingStep]}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Résultats */}
            {result && <MealDetails data={result} onBack={() => { setImage(null); setResult(null); }} />}
          </div>
        )}

        {activeTab === 'historique' && (
          <div className="space-y-6">
            {selectedHistoryItem ? (
              <MealDetails data={selectedHistoryItem} onBack={() => setSelectedHistoryItem(null)} />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Historique</h2>
                    <p className="text-slate-600">Vos analyses récentes</p>
                  </div>
                  <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium">
                    {history.length} repas
                  </div>
                </div>

                <div className="space-y-4">
                  {history.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedHistoryItem(item)}
                      className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all active:scale-98"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Apple className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-slate-900">{item.name}</h4>
                            <div className={`px-2 py-1 rounded-lg text-xs font-medium ${getScoreColor(item.healthScore)}`}>
                              {item.healthLabel}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">{item.date}</span>
                            <span className="font-medium text-slate-900">{item.totalCalories} kcal</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'profil' && (
          <div className="space-y-6">
            {/* Profil utilisateur */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                JD
              </div>
              <h2 className="text-xl font-bold text-slate-900">Jean Dupont</h2>
              <p className="text-slate-600 text-sm">Utilisateur Premium</p>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">92%</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Objectif</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900">8.2</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">Moyenne</div>
              </div>
            </div>

            {/* Menu paramètres */}
            <div className="space-y-3">
              {[
                { icon: BarChart3, label: 'Statistiques détaillées', color: 'text-purple-600 bg-purple-100' },
                { icon: Settings, label: 'Préférences', color: 'text-slate-600 bg-slate-100' },
                { icon: Heart, label: 'Objectifs santé', color: 'text-red-600 bg-red-100' }
              ].map((item, i) => (
                <button
                  key={i}
                  className="w-full bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-all active:scale-98"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-slate-900">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Navigation moderne */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md z-50">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl px-6 py-4 shadow-xl">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setActiveTab('historique')}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === 'historique' ? 'text-emerald-600 scale-110' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock className={`w-6 h-6 ${activeTab === 'historique' ? 'fill-emerald-100' : ''}`} />
              <span className="text-xs font-medium">Historique</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className="relative -top-2"
            >
              <div className={`w-16 h-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
                activeTab === 'scanner' ? 'scale-110 shadow-emerald-200' : 'hover:scale-105'
              }`}>
                <Camera className="w-7 h-7 text-white" />
              </div>
              {activeTab === 'scanner' && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('profil')}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === 'profil' ? 'text-emerald-600 scale-110' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className={`w-6 h-6 ${activeTab === 'profil' ? 'fill-emerald-100' : ''}`} />
              <span className="text-xs font-medium">Profil</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default App;