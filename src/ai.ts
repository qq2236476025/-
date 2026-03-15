import { GoogleGenAI, Type } from '@google/genai';
import { Ingredient } from './db';

export const fetchIngredientFromAI = async (
  name: string, 
  provider: 'gemini' | 'deepseek', 
  apiKey: string
): Promise<Partial<Ingredient>> => {
  const prompt = `请提供关于食材“${name}”的以下信息，要求专业且详细：
1. 挑选技巧（详细说明外观、气味、触感等特征）
2. 最佳搭配（推荐搭配的食材）
3. 不能同食（列出不能一同食用、会对身体造成不良影响的食物及原因）
4. 处理禁忌（详细说明清洗、烹饪、食用过程中的注意事项和禁忌）`;

  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "你是一个专业的食材百科助手。请用温馨、详细的语言回答。",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            selectionTips: { type: Type.STRING, description: "详细的挑选技巧" },
            bestPairings: { type: Type.STRING, description: "最佳搭配" },
            badPairings: { type: Type.STRING, description: "不能同食的食物及原因" },
            processingTaboos: { type: Type.STRING, description: "详细的处理禁忌" }
          },
          required: ["selectionTips", "bestPairings", "badPairings", "processingTaboos"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("AI没有返回内容");
    
    const data = JSON.parse(text);
    return {
      name,
      selectionTips: data.selectionTips,
      bestPairings: data.bestPairings,
      badPairings: data.badPairings,
      processingTaboos: data.processingTaboos
    };
  } else if (provider === 'deepseek') {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { 
            role: 'system', 
            content: '你是一个专业的食材百科助手。请用温馨、详细的语言回答。必须返回合法的JSON格式，包含以下四个字符串字段：selectionTips, bestPairings, badPairings, processingTaboos。不要包含任何其他内容或Markdown标记。' 
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'DeepSeek API 请求失败');
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return {
      name,
      selectionTips: parsed.selectionTips || '',
      bestPairings: parsed.bestPairings || '',
      badPairings: parsed.badPairings || '',
      processingTaboos: parsed.processingTaboos || ''
    };
  }
  
  throw new Error("未知的AI提供商");
};
