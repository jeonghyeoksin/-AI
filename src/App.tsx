import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  Calendar, 
  Settings, 
  Sparkles, 
  ChevronRight, 
  Copy, 
  Check, 
  Loader2,
  BookOpen,
  Users,
  Heart,
  Target,
  Key,
  X,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { generateBlogPost, suggestTopics, setApiKey, type BlogRequest, type BlogResponse } from './services/geminiService';
import { BLOG_TOPICS } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type WorkflowStep = 'idle' | 'title' | 'body' | 'images' | 'thumbnail' | 'final';

export default function App() {
  const [activeTab, setActiveTab] = useState<'generate' | 'calendar' | 'settings'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('idle');
  const [generatedData, setGeneratedData] = useState<BlogResponse | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  
  const [apiKey, setApiKeyInput] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isKeyApplied, setIsKeyApplied] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) {
      setApiKeyInput(savedKey);
      setApiKey(savedKey);
      setIsKeyApplied(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      setApiKey(apiKey.trim());
      setIsKeyApplied(true);
      setIsKeyModalOpen(false);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
      setApiKey(null);
      setIsKeyApplied(false);
      setIsKeyModalOpen(false);
    }
  };

  const [request, setRequest] = useState<BlogRequest>({
    topic: '',
    targetAudience: '학부모 및 교육 관계자',
    tone: 'friendly',
    additionalInfo: '',
    logoBase64: null
  });

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (activeTab === 'calendar' && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [activeTab]);

  const loadSuggestions = async () => {
    if (isLoadingSuggestions) return;
    setIsLoadingSuggestions(true);
    
    const timeoutId = setTimeout(() => {
      setIsLoadingSuggestions(false);
    }, 15000);

    try {
      const data = await suggestTopics();
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingSuggestions(false);
    }
  };

  const handleGenerate = async () => {
    if (!request.topic) return;
    setIsGenerating(true);
    setGeneratedData(null);
    setWorkflowStep('title');
    
    try {
      const data = await generateBlogPost(request, (step) => {
        setWorkflowStep(step as WorkflowStep);
      });
      setGeneratedData(data);
      setWorkflowStep('final');
    } catch (error) {
      console.error(error);
      alert('생성 중 오류가 발생했습니다.');
      setWorkflowStep('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTitle = () => {
    if (generatedData?.title) {
      navigator.clipboard.writeText(generatedData.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  };

  const copyBody = async () => {
    if (generatedData?.body) {
      const container = document.querySelector('.prose');
      if (!container) return;

      try {
        const html = container.innerHTML;
        const text = container.textContent || "";
        
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([text], { type: 'text/plain' });
        
        const data = [new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        })];
        
        await navigator.clipboard.write(data);
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      } catch (err) {
        console.error('Failed to copy HTML:', err);
        // Fallback to plain text
        navigator.clipboard.writeText(generatedData.body);
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllImages = () => {
    if (generatedData?.infographicUrls) {
      generatedData.infographicUrls.forEach((url, i) => {
        setTimeout(() => downloadImage(url, `bettergim-infographic-${i+1}.png`), i * 300);
      });
    }
    if (generatedData?.thumbnailUrl) {
      setTimeout(() => {
        if (generatedData?.thumbnailUrl) {
          downloadImage(generatedData.thumbnailUrl, 'bettergim-thumbnail.png');
        }
      }, 1500);
    }
  };

  const workflowItems = [
    { id: 'title', label: '제목 생성' },
    { id: 'body', label: '본문 생성' },
    { id: 'images', label: '이미지 생성' },
    { id: 'thumbnail', label: '썸네일 생성' },
    { id: 'final', label: '최종 결과물' }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">더나아짐 블로그 AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold opacity-70">Better-Gim Blog Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl">
              {[
                { id: 'generate', icon: PenTool, label: '포스팅 생성' },
                { id: 'calendar', icon: Calendar, label: '주제 추천' },
                { id: 'settings', icon: Settings, label: '설정' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab.id 
                      ? "bg-white text-emerald-600 shadow-sm" 
                      : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                  )}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsKeyModalOpen(true)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                isKeyApplied 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-amber-50 text-amber-700 border-amber-200"
              )}
            >
              {isKeyApplied ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
              <span className="hidden md:inline">API Key</span>
            </button>
          </div>
        </div>
      </nav>

      {/* API Key Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                    <Key size={18} />
                  </div>
                  <h3 className="font-bold text-lg">Google API Key 설정</h3>
                </div>
                <button 
                  onClick={() => setIsKeyModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Vercel 배포 환경에서 Gemini API를 사용하기 위해 구글 API 키를 입력해주세요. 
                  입력된 키는 브라우저의 로컬 스토리지에 안전하게 저장됩니다.
                </p>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">API Key</label>
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <ShieldAlert size={16} className="text-amber-600 shrink-0" />
                  <p className="text-[11px] text-amber-700">
                    키를 입력하지 않으면 서버에 설정된 기본 API 키를 사용합니다.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setIsKeyModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveKey}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'generate' && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Input Section */}
              <div className="lg:col-span-4 space-y-6">
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <PenTool size={20} className="text-emerald-600" />
                    포스팅 설정
                  </h2>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">주제 및 키워드</label>
                      <textarea
                        value={request.topic}
                        onChange={(e) => setRequest({ ...request, topic: e.target.value })}
                        placeholder="예: 통합 교육의 중요성과 더나아짐의 역할"
                        className="w-full h-32 px-4 py-3 rounded-xl border border-black/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">타겟 독자</label>
                        <select
                          value={request.targetAudience}
                          onChange={(e) => setRequest({ ...request, targetAudience: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm outline-none focus:border-emerald-500"
                        >
                          <option>학부모</option>
                          <option>교육 관계자</option>
                          <option>지역 주민</option>
                          <option>일반 대중</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">말투 (톤)</label>
                        <select
                          value={request.tone}
                          onChange={(e) => setRequest({ ...request, tone: e.target.value as any })}
                          className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-sm outline-none focus:border-emerald-500"
                        >
                          <option value="friendly">친근하고 따뜻한</option>
                          <option value="professional">전문적이고 신뢰감 있는</option>
                          <option value="informative">정보 전달 중심</option>
                        </select>
                      </div>
                    </div>

                    {/* Logo Upload Section */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      로고 추가 (선택)
                      <span className="text-[10px] font-normal text-gray-400 lowercase italic">이미지에 로고가 포함됩니다</span>
                    </label>
                    <div className="flex items-center gap-4 p-4 border border-black/5 rounded-xl bg-gray-50/50">
                      <div className="w-12 h-12 bg-white rounded-lg border border-black/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {request.logoBase64 ? (
                          <img src={request.logoBase64} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : (
                          <Sparkles size={20} className="text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="file" 
                          id="logo-upload"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setRequest(prev => ({ ...prev, logoBase64: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="inline-block px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold cursor-pointer hover:bg-emerald-100 transition-colors"
                        >
                          파일 선택
                        </label>
                        {request.logoBase64 && (
                          <button 
                            type="button"
                            onClick={() => setRequest(prev => ({ ...prev, logoBase64: null }))}
                            className="text-[10px] font-bold text-red-500 hover:underline ml-3"
                          >
                            로고 제거
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                      disabled={isGenerating || !request.topic}
                      className={cn(
                        "w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2",
                        isGenerating || !request.topic 
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.98]"
                      )}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles size={20} />
                          AI 블로그 생성하기
                        </>
                      )}
                    </button>
                  </div>
                </section>

                {/* Workflow Visualization */}
                {isGenerating && (
                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">실시간 워크플로우</h3>
                    <div className="space-y-4">
                      {workflowItems.map((item, idx) => {
                        const isCompleted = workflowItems.findIndex(i => i.id === workflowStep) > idx;
                        const isActive = workflowStep === item.id;
                        
                        return (
                          <div key={item.id} className="flex items-center gap-3">
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                              isCompleted ? "bg-emerald-600 text-white" : 
                              isActive ? "bg-emerald-100 text-emerald-600 border border-emerald-200 animate-pulse" : 
                              "bg-gray-100 text-gray-400"
                            )}>
                              {isCompleted ? <Check size={12} /> : idx + 1}
                            </div>
                            <span className={cn(
                              "text-xs font-medium transition-all",
                              isCompleted ? "text-emerald-600" : 
                              isActive ? "text-gray-900 font-bold" : 
                              "text-gray-400"
                            )}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {/* Preview Section */}
              <div className="lg:col-span-8 space-y-6">
                {/* Images Row */}
                <AnimatePresence>
                  {generatedData && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Generated Assets</h3>
                        <button
                          onClick={downloadAllImages}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                          <Copy size={14} />
                          전체 이미지 다운로드 (PNG)
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Thumbnail */}
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 aspect-square relative group">
                          <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                            Hooking Thumbnail (1:1)
                          </div>
                          {generatedData.thumbnailUrl ? (
                            <img src={generatedData.thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 italic text-sm">이미지 생성 실패</div>
                          )}
                        </div>
                        
                        {/* Infographics Grid */}
                        <div className="grid grid-cols-1 gap-4">
                          {generatedData.infographicUrls.slice(0, 2).map((url, i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 aspect-video relative group">
                              <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                                Infographic {i+1} (16:9)
                              </div>
                              <img src={url} alt={`Infographic ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedData.infographicUrls.slice(2, 4).map((url, i) => (
                          <div key={i+2} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 aspect-video relative group">
                            <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold uppercase tracking-wider">
                              Infographic {i+3} (16:9)
                            </div>
                            <img src={url} alt={`Infographic ${i+3}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content Section */}
                <div className="space-y-4">
                  {/* Title Section */}
                  <section className="bg-white rounded-2xl shadow-sm border border-black/5 flex flex-col overflow-hidden">
                    <div className="px-6 py-3 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Blog Title</span>
                      {generatedData?.title && (
                        <button
                          onClick={copyTitle}
                          className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-black/5 hover:bg-gray-50 transition-colors"
                        >
                          {copiedTitle ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          {copiedTitle ? '복사됨' : '제목 복사'}
                        </button>
                      )}
                    </div>
                    <div className="p-6">
                      {isGenerating && workflowStep === 'title' ? (
                        <div className="h-8 bg-gray-100 animate-pulse rounded-lg w-3/4" />
                      ) : generatedData?.title ? (
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                          {generatedData.title}
                        </h2>
                      ) : (
                        <p className="text-sm text-gray-300 italic">제목이 여기에 표시됩니다.</p>
                      )}
                    </div>
                  </section>

                  {/* Body Section */}
                  <section className="bg-white rounded-2xl shadow-sm border border-black/5 min-h-[400px] flex flex-col">
                    <div className="px-6 py-3 border-b border-black/5 flex items-center justify-between bg-gray-50/50">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Blog Body Content</span>
                      {generatedData?.body && (
                        <button
                          onClick={copyBody}
                          className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-black/5 hover:bg-gray-50 transition-colors"
                        >
                          {copiedBody ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          {copiedBody ? '복사됨' : '본문 HTML 복사 (스타일 유지)'}
                        </button>
                      )}
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto max-h-[1200px]">
                      {isGenerating && (workflowStep === 'title' || workflowStep === 'body') ? (
                        <div className="space-y-4">
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-full" />
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-5/6" />
                          <div className="h-4 bg-gray-100 animate-pulse rounded w-4/6" />
                          <div className="h-32 bg-gray-50 animate-pulse rounded w-full" />
                        </div>
                      ) : generatedData?.body ? (
                        <div className="prose prose-emerald max-w-none prose-sm sm:prose-base">
                          <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                            {generatedData.body}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 text-center py-20">
                          <PenTool size={48} strokeWidth={1} />
                          <div>
                            <p className="font-bold text-gray-400">생성된 포스팅이 없습니다</p>
                            <p className="text-xs">왼쪽에서 주제를 입력하고 생성 버튼을 눌러보세요.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">이번 달 추천 주제</h2>
                  <p className="text-gray-500 text-sm">더나아짐의 사업 영역을 기반으로 한 AI 추천 주제입니다.</p>
                </div>
                <button 
                  onClick={loadSuggestions}
                  disabled={isLoadingSuggestions}
                  className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-black/10 text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <Loader2 size={16} className={isLoadingSuggestions ? "animate-spin" : ""} />
                  새로고침
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoadingSuggestions ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-black/5 animate-pulse space-y-4">
                      <div className="h-6 bg-gray-100 rounded w-3/4" />
                      <div className="h-20 bg-gray-50 rounded" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </div>
                  ))
                ) : suggestions.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      {idx % 3 === 0 ? <BookOpen size={20} /> : idx % 3 === 1 ? <Users size={20} /> : <Target size={20} />}
                    </div>
                    <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-3">{item.description}</p>
                    <div className="pt-4 border-t border-black/5">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">AI 추천 이유</p>
                      <p className="text-xs text-gray-400 italic">{item.reason}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setRequest({ ...request, topic: item.title });
                        setActiveTab('generate');
                      }}
                      className="mt-6 w-full py-2 bg-black/5 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      이 주제로 작성하기
                      <ChevronRight size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <section className="bg-white rounded-2xl p-8 shadow-sm border border-black/5 space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-2">AI 설정</h2>
                  <p className="text-gray-500 text-sm">블로그 생성 AI의 기본 동작을 설정합니다.</p>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h3 className="text-sm font-bold text-emerald-800 mb-1">학습된 데이터 컨텍스트</h3>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      현재 AI는 주식회사 더나아짐의 사업 소개(전문 연구, 바우처 서비스, 통합 교육, ESG 경영) 데이터를 기반으로 최적화되어 있습니다.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-black/5">
                      <div>
                        <p className="font-bold text-sm">자동 해시태그 생성</p>
                        <p className="text-xs text-gray-400">포스팅 하단에 관련 해시태그를 자동으로 추가합니다.</p>
                      </div>
                      <div className="w-10 h-5 bg-emerald-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-black/5">
                      <div>
                        <p className="font-bold text-sm">마크다운 형식 사용</p>
                        <p className="text-xs text-gray-400">가독성을 위해 제목, 리스트, 강조 등을 마크다운으로 작성합니다.</p>
                      </div>
                      <div className="w-10 h-5 bg-emerald-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5">
                  <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">
                    Better-Gim Blog AI v1.0.0
                  </p>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
