/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useDropzone, type FileRejection, type DropEvent, type DropzoneOptions } from 'react-dropzone';
import { 
  Upload, 
  Camera, 
  TrendingUp, 
  History, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Plane,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Gemini AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface GameData {
  multipliers: number[];
  predictedCrashPoint: number;
  confidence: string;
  reasoning: string;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result as string);
          setResult(null);
          setError(null);
        };
        reader.readAsDataURL(file);
      }
    },
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    multiple: false
  } as any);

  const analyzeImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: `Analyze this screenshot of a crash game (like Aviator). 
            1. Extract all visible past multipliers (e.g., 1.2x, 5.1x, etc.).
            2. Based on these patterns, predict the EXACT multiplier where the plane will fly away in the next round.
            3. Provide a brief reasoning for the prediction.
            Return the data in JSON format.`,
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              multipliers: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: "List of extracted past multipliers",
              },
              predictedCrashPoint: {
                type: Type.NUMBER,
                description: "The predicted multiplier where the plane will crash/fly away",
              },
              confidence: {
                type: Type.STRING,
                description: "Confidence level (High, Medium, Low)",
              },
              reasoning: {
                type: Type.STRING,
                description: "Brief explanation of the suggestion",
              },
            },
            required: ["multipliers", "predictedCrashPoint", "confidence", "reasoning"],
          },
        },
      });

      const data = JSON.parse(response.text || '{}');
      setResult(data);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Falha ao analisar a imagem. Certifique-se de que os multiplicadores estão visíveis.");
    } finally {
      setLoading(false);
    }
  };

  const suggestedCashOut = result ? result.predictedCrashPoint - 1.0 : 0;
  const isTooRisky = result ? result.predictedCrashPoint < 2.1 : false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-2xl border border-red-500/20 mb-2"
          >
            <Plane className="w-8 h-8 text-red-500" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Aviator <span className="text-red-500">Predictor AI</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Analise o histórico de jogos através de capturas de tela e receba sugestões de saque baseadas em IA.
          </p>
        </header>

        {/* Main Content */}
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <section className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Camera className="w-5 h-5 text-red-500" />
                Captura de Tela
              </h2>
              
              <div 
                {...getRootProps()} 
                className={`
                  relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer
                  ${isDragActive ? 'border-red-500 bg-red-500/5' : 'border-slate-700 hover:border-slate-600 bg-slate-950/50'}
                  ${image ? 'aspect-video overflow-hidden p-0' : 'h-64'}
                `}
              >
                <input {...getInputProps()} />
                {image ? (
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="p-4 bg-slate-800 rounded-full">
                      <Upload className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium">Clique ou arraste o print aqui</p>
                      <p className="text-sm text-slate-500">Suporta PNG, JPG</p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={analyzeImage}
                disabled={!image || loading}
                className={`
                  w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                  ${!image || loading 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 active:scale-[0.98]'}
                `}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analisando Dados...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Calcular Multiplicador
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm"
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <h3 className="font-medium text-sm">Saque Seguro</h3>
                <p className="text-xs text-slate-500">Sugestões focadas em manter ganhos constantes.</p>
              </div>
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="font-medium text-sm">Análise IA</h3>
                <p className="text-xs text-slate-500">Processamento de padrões históricos em tempo real.</p>
              </div>
            </div>
          </section>

          {/* Results Section */}
          <section className="space-y-6">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Prediction Card */}
                  <div className={`rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden transition-colors ${isTooRisky ? 'bg-slate-800 shadow-slate-900/20' : 'bg-gradient-to-br from-red-600 to-red-700 shadow-red-600/20'}`}>
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                          {isTooRisky ? 'Aviso de Risco' : 'Sugestão de Saque'}
                        </span>
                        {isTooRisky ? <AlertCircle className="w-6 h-6 text-white/80" /> : <CheckCircle2 className="w-6 h-6 text-white/80" />}
                      </div>
                      
                      {isTooRisky ? (
                        <div className="space-y-2">
                          <span className="text-3xl font-black block">Melhor não nessa jogada</span>
                          <p className="text-white/60 text-sm">Previsão de queda em {result.predictedCrashPoint.toFixed(2)}x (muito baixo).</p>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl font-black">{suggestedCashOut.toFixed(2)}</span>
                          <span className="text-2xl font-bold opacity-80">x</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="text-white/80 text-sm font-medium">Confiança: {result.confidence}</p>
                        <p className="text-white/90 text-sm leading-relaxed">{result.reasoning}</p>
                      </div>
                    </div>
                    {/* Decorative Plane */}
                    <Plane className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 -rotate-12" />
                  </div>

                  {/* History List */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <History className="w-5 h-5 text-slate-400" />
                      Dados Extraídos
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.multipliers.map((m, i) => (
                        <span 
                          key={i} 
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-mono font-bold border
                            ${m >= 2 ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 
                              m >= 1.5 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                              'bg-slate-800 border-slate-700 text-slate-400'}
                          `}
                        >
                          {m.toFixed(2)}x
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[400px] bg-slate-900/30 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-center p-8 space-y-4"
                >
                  <div className="p-6 bg-slate-900 rounded-full">
                    <TrendingUp className="w-12 h-12 text-slate-700" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-slate-400 font-semibold text-lg">Aguardando Análise</h3>
                    <p className="text-slate-600 text-sm">
                      Faça o upload de um print do histórico para ver a previsão da IA.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        {/* Footer */}
        <footer className="pt-8 border-t border-slate-800 text-center space-y-4">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
            Aviso de Responsabilidade
          </p>
          <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed">
            Este aplicativo é uma ferramenta de análise estatística baseada em IA. 
            Resultados passados não garantem ganhos futuros. Jogue com responsabilidade. 
            Compatível com Elephant Bet, Premier Bet, Bantu Bet e Kwanza Bet.
          </p>
        </footer>
      </div>
    </div>
  );
}
