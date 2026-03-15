import React, { useState, useEffect } from 'react';
import { Search, Settings, Edit2, Trash2, WifiOff, BookOpen, Plus, X, Save, Leaf, Database, ArrowLeft } from 'lucide-react';
import { Ingredient, getIngredient, saveIngredient, deleteIngredient, getAllIngredients } from './db';
import { builtinData } from './builtinData';
import { fetchIngredientFromAI } from './ai';

export default function App() {
  const [query, setQuery] = useState('');
  const [currentIngredient, setCurrentIngredient] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsAI, setNeedsAI] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [apiProvider, setApiProvider] = useState<'gemini' | 'deepseek'>(
    (localStorage.getItem('api_provider') as 'gemini' | 'deepseek') || 'gemini'
  );
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [deepseekApiKey, setDeepseekApiKey] = useState(localStorage.getItem('deepseek_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState<Ingredient | null>(null);
  
  const [savedList, setSavedList] = useState<Ingredient[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadSavedIngredients();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSavedIngredients = async () => {
    try {
      const list = await getAllIngredients();
      setSavedList(list.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (e) {
      console.error("Failed to load saved ingredients", e);
    }
  };

  const handleGoHome = () => {
    setQuery('');
    setCurrentIngredient(null);
    setNeedsAI(false);
    setError('');
  };

  const handleSearch = async (searchName: string = query) => {
    if (!searchName.trim()) return;
    setQuery(searchName);
    setLoading(true);
    setError('');
    setCurrentIngredient(null);
    setNeedsAI(false);

    const name = searchName.trim();

    try {
      let item = await getIngredient(name);
      
      if (!item && builtinData[name]) {
        item = builtinData[name];
      }

      if (item) {
        setCurrentIngredient(item);
      } else {
        if (!isOnline) {
          setError('当前离线，无法查询新食材。');
        } else {
          setNeedsAI(true);
        }
      }
    } catch (err) {
      setError('查询出错，请重试。');
    } finally {
      setLoading(false);
    }
  };

  const handleAICall = async () => {
    const currentKey = apiProvider === 'gemini' ? apiKey : deepseekApiKey;
    if (!currentKey) {
      setShowSettings(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const aiData = await fetchIngredientFromAI(query.trim(), apiProvider, currentKey);
      const newItem: Ingredient = {
        id: query.trim(),
        name: query.trim(),
        selectionTips: aiData.selectionTips || '',
        bestPairings: aiData.bestPairings || '',
        badPairings: aiData.badPairings || '',
        processingTaboos: aiData.processingTaboos || '',
        source: 'ai',
        updatedAt: Date.now()
      };
      await saveIngredient(newItem);
      setCurrentIngredient(newItem);
      setNeedsAI(false);
      loadSavedIngredients();
      showToast('AI 生成成功');
    } catch (err: any) {
      setError(err.message || 'AI查询失败，请检查网络或API Key。');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteIngredient(deleteConfirmId);
    if (currentIngredient?.id === deleteConfirmId) {
      setCurrentIngredient(null);
    }
    loadSavedIngredients();
    setDeleteConfirmId(null);
    showToast('删除成功');
  };

  const openEdit = (item: Ingredient | null) => {
    setEditItem(item ? { ...item } : {
      id: query.trim() || '新食材',
      name: query.trim() || '新食材',
      selectionTips: '',
      bestPairings: '',
      badPairings: '',
      processingTaboos: '',
      source: 'user',
      updatedAt: Date.now()
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async (item: Ingredient) => {
    item.updatedAt = Date.now();
    item.source = 'user';
    await saveIngredient(item);
    setShowEdit(false);
    setCurrentIngredient(item);
    loadSavedIngredients();
    showToast('保存成功');
  };

  return (
    <div className="min-h-screen pb-20 max-w-md mx-auto relative shadow-2xl bg-[#FAF8F5]">
      {/* Header */}
      <header className="bg-[#8BC34A] text-white p-6 rounded-b-3xl shadow-md relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-20">
          <Leaf size={120} />
        </div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen size={24} /> 食材百科
            </h1>
            <p className="text-lime-100 text-sm mt-1 opacity-90">你的厨房小助手</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-orange-100 text-orange-800 px-4 py-2 text-sm flex items-center justify-center gap-2">
          <WifiOff size={16} /> 当前处于离线模式，仅可查看已保存食材
        </div>
      )}

      <main className="p-4">
        {/* Search Bar */}
        <div className="relative mt-2 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入食材名称，如：西红柿"
            className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-lime-100 focus:border-lime-400 focus:outline-none shadow-sm bg-white text-stone-700 placeholder-stone-400 text-lg"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-lime-500" size={24} />
          {query && (
            <button 
              onClick={handleGoHome}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => handleSearch()} 
            disabled={!query.trim() || loading}
            className="flex-1 watercolor-button text-white font-bold py-3 px-6 text-lg flex items-center justify-center gap-2"
          >
            {loading && !needsAI ? '查询中...' : '查询'}
          </button>
          <button 
            onClick={() => openEdit(null)}
            className="w-14 h-14 rounded-full bg-white border-2 border-lime-200 text-lime-600 flex items-center justify-center shadow-sm hover:bg-lime-50 transition-colors"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center p-4 bg-red-50 text-red-600 rounded-2xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {/* AI Prompt */}
        {needsAI && isOnline && (
          <div className="flex flex-col gap-4 mb-6">
            <div className="watercolor-card p-6 text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4 text-lime-600">
                <Database size={32} />
              </div>
              <h3 className="text-lg font-bold text-stone-700 mb-2">未找到“{query}”</h3>
              <p className="text-stone-500 mb-6 text-sm">本地库中没有该食材，是否使用AI为您生成百科信息？</p>
              <button 
                onClick={handleAICall}
                disabled={loading}
                className="watercolor-button w-full text-white font-bold py-3 px-6 flex items-center justify-center gap-2"
              >
                {loading ? 'AI生成中...' : '使用AI生成'}
              </button>
            </div>
            <button 
              onClick={handleGoHome}
              className="w-full py-4 rounded-2xl font-bold text-stone-600 bg-white border-2 border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowLeft size={20} /> 返回首页
            </button>
          </div>
        )}

        {/* Result Card */}
        {currentIngredient && (
          <div className="flex flex-col gap-4 mb-6">
            <IngredientCard 
              item={currentIngredient} 
              onEdit={() => openEdit(currentIngredient)}
              onDelete={() => handleDelete(currentIngredient.id)}
            />
            <button 
              onClick={handleGoHome}
              className="w-full py-4 rounded-2xl font-bold text-stone-600 bg-white border-2 border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowLeft size={20} /> 返回首页
            </button>
          </div>
        )}

        {/* Saved List */}
        {!currentIngredient && !needsAI && (
          <div className="mt-8">
            <h3 className="text-stone-500 font-bold mb-4 flex items-center gap-2 px-2">
              <BookOpen size={18} /> 我的食材库
            </h3>
            {savedList.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {savedList.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleSearch(item.name)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 text-left hover:border-lime-300 transition-colors flex flex-col gap-1"
                  >
                    <span className="font-bold text-stone-700 truncate">{item.name}</span>
                    <span className="text-xs text-stone-400">
                      {item.source === 'ai' ? 'AI生成' : '自定义'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 px-4 border-2 border-dashed border-stone-200 rounded-3xl bg-white/50">
                <div className="text-4xl mb-3 opacity-50">🥗</div>
                <p className="text-stone-500 text-sm">还没有保存任何食材哦<br/>搜索或手动添加一个吧</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="watercolor-card p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-stone-800">设置</h2>
              <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">AI 模型选择</label>
                <select 
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value as 'gemini' | 'deepseek')}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-stone-50 mb-4"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              
              {apiProvider === 'gemini' ? (
                <div>
                  <label className="block text-sm font-bold text-stone-600 mb-2">Gemini API Key</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="输入你的 Gemini API Key"
                    className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-stone-50"
                  />
                  <p className="text-xs text-stone-400 mt-2">用于查询未知食材。留空则使用系统默认Key（如果有）。</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-bold text-stone-600 mb-2">DeepSeek API Key</label>
                  <input 
                    type="password" 
                    value={deepseekApiKey}
                    onChange={(e) => setDeepseekApiKey(e.target.value)}
                    placeholder="输入你的 DeepSeek API Key"
                    className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-stone-50"
                  />
                  <p className="text-xs text-stone-400 mt-2">用于查询未知食材。需自行申请 DeepSeek API Key。</p>
                </div>
              )}
              
              <button 
                onClick={() => {
                  localStorage.setItem('api_provider', apiProvider);
                  localStorage.setItem('gemini_api_key', apiKey);
                  localStorage.setItem('deepseek_api_key', deepseekApiKey);
                  setShowSettings(false);
                }}
                className="watercolor-button w-full text-white font-bold py-3 mt-4"
              >
                保存设置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editItem && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-[#FAF8F5] w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-t-4 border-lime-400">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-white">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <Edit2 size={18} className="text-lime-600" /> 
                {editItem.source === 'user' && !editItem.selectionTips ? '新增食材' : '编辑食材'}
              </h2>
              <button onClick={() => setShowEdit(false)} className="p-2 text-stone-400 hover:text-stone-600 bg-stone-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2">食材名称</label>
                <input 
                  type="text" 
                  value={editItem.name}
                  onChange={(e) => setEditItem({...editItem, name: e.target.value, id: e.target.value})}
                  disabled={editItem.source !== 'user' && !!editItem.selectionTips}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-white disabled:bg-stone-100 disabled:text-stone-500 font-bold text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2 flex items-center gap-1"><span className="text-lg">🔍</span> 挑选技巧</label>
                <textarea 
                  value={editItem.selectionTips}
                  onChange={(e) => setEditItem({...editItem, selectionTips: e.target.value})}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-white min-h-[100px] resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2 flex items-center gap-1"><span className="text-lg">🤝</span> 最佳搭配</label>
                <textarea 
                  value={editItem.bestPairings}
                  onChange={(e) => setEditItem({...editItem, bestPairings: e.target.value})}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-white min-h-[80px] resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2 flex items-center gap-1"><span className="text-lg">🚫</span> 不能同食</label>
                <textarea 
                  value={editItem.badPairings || ''}
                  onChange={(e) => setEditItem({...editItem, badPairings: e.target.value})}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-white min-h-[80px] resize-none leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-600 mb-2 flex items-center gap-1"><span className="text-lg">⚠️</span> 处理禁忌</label>
                <textarea 
                  value={editItem.processingTaboos}
                  onChange={(e) => setEditItem({...editItem, processingTaboos: e.target.value})}
                  className="w-full p-3 rounded-xl border border-stone-200 focus:border-lime-500 focus:outline-none bg-white min-h-[80px] resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 bg-white border-t border-stone-200">
              <button 
                onClick={() => handleSaveEdit(editItem)}
                disabled={!editItem.name.trim()}
                className="watercolor-button w-full text-white font-bold py-4 flex items-center justify-center gap-2 text-lg"
              >
                <Save size={20} /> 保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="watercolor-card p-6 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <Trash2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-2">确认删除？</h3>
            <p className="text-stone-500 mb-6 text-sm">删除后将无法恢复，确定要删除这条记录吗？</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 rounded-full font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-full font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-md shadow-red-500/30"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70]">
          <div className={`px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 ${toast.type === 'success' ? 'bg-[#8BC34A] text-white' : 'bg-red-500 text-white'}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}

const IngredientCard = ({ item, onEdit, onDelete }: { item: Ingredient, onEdit: () => void, onDelete: () => void }) => (
  <div className="watercolor-card p-6 mt-2 relative overflow-hidden">
    <div className="absolute -top-6 -right-6 text-lime-100 opacity-40 rotate-12 pointer-events-none">
      <Leaf size={140} />
    </div>
    
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold text-stone-800 flex items-center gap-3 mb-2">
            {item.name}
          </h2>
          <span className="text-xs px-3 py-1 bg-lime-100 text-lime-700 rounded-full font-bold tracking-wider">
            {item.source === 'builtin' ? '内置数据' : item.source === 'ai' ? 'AI生成' : '自定义'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2.5 text-stone-400 hover:text-lime-600 hover:bg-lime-50 transition-colors bg-white border border-stone-100 rounded-full shadow-sm">
            <Edit2 size={18} />
          </button>
          {item.source !== 'builtin' && (
            <button onClick={onDelete} className="p-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors bg-white border border-stone-100 rounded-full shadow-sm">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Section title="挑选技巧" content={item.selectionTips} icon="🔍" bg="bg-blue-50/50" border="border-blue-100" />
        <Section title="最佳搭配" content={item.bestPairings} icon="🤝" bg="bg-orange-50/50" border="border-orange-100" />
        <Section title="不能同食" content={item.badPairings} icon="🚫" bg="bg-purple-50/50" border="border-purple-100" />
        <Section title="处理禁忌" content={item.processingTaboos} icon="⚠️" bg="bg-red-50/50" border="border-red-100" />
      </div>
    </div>
  </div>
);

const Section = ({ title, content, icon, bg, border }: { title: string, content: string, icon: string, bg: string, border: string }) => (
  <div className={`${bg} p-5 rounded-2xl border ${border}`}>
    <h3 className="text-lg font-bold text-stone-700 mb-2 flex items-center gap-2">
      <span className="text-xl">{icon}</span> {title}
    </h3>
    <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{content || '暂无内容'}</p>
  </div>
);
