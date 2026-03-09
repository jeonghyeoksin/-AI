import { GoogleGenAI, Type } from "@google/genai";
import { BETTERGIM_CONTEXT } from "../constants";

let customApiKey: string | null = null;

export const setApiKey = (key: string | null) => {
  customApiKey = key;
};

const getAI = () => {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
};

export interface BlogRequest {
  topic: string;
  targetAudience: string;
  tone: 'professional' | 'friendly' | 'informative';
  additionalInfo?: string;
  logoBase64?: string | null;
}

export interface BlogResponse {
  title: string;
  body: string;
  infographicUrls: string[];
  thumbnailUrl?: string;
}

export const generateBlogImages = async (text: string, title: string, topic: string, logoBase64?: string | null) => {
  const ai = getAI();
  const model = "gemini-3-pro-image-preview";

  const logoPart = logoBase64 ? {
    inlineData: {
      mimeType: logoBase64.split(',')[0].split(':')[1].split(';')[0],
      data: logoBase64.split(',')[1]
    }
  } : null;

  // Generate 4 Infographics (16:9)
  const infographicPrompts = [
    `Professional 16:9 infographic for '더나아짐'. Topic: ${topic}. Focus on inclusive education. Clean, modern, emerald green. Use ONLY Korean text. NO English. Short, clear Korean text: "함께하는 교육". ${logoPart ? "CRITICAL: You MUST include the provided brand logo image in this design, placing it prominently but naturally (e.g., top corner)." : ""}`,
    `Professional 16:9 infographic for '더나아짐'. Topic: ${topic}. Focus on sports career research. Clean, modern, emerald green. Use ONLY Korean text. NO English. Short Korean text: "꿈을 향한 도전". ${logoPart ? "CRITICAL: You MUST include the provided brand logo image in this design." : ""}`,
    `Professional 16:9 infographic for '더나아짐'. Topic: ${topic}. Focus on social contribution and ESG. Clean, modern, emerald green. Use ONLY Korean text. NO English. Short Korean text: "나눔의 가치". ${logoPart ? "CRITICAL: You MUST include the provided brand logo image in this design." : ""}`,
    `Professional 16:9 infographic for '더나아짐'. Topic: ${topic}. Focus on future vision. Clean, modern, emerald green. Use ONLY Korean text. NO English. Short Korean text: "더 나은 내일". ${logoPart ? "CRITICAL: You MUST include the provided brand logo image in this design." : ""}`
  ];

  const infographicPromises = infographicPrompts.map(prompt => {
    const parts: any[] = [{ text: prompt }];
    if (logoPart) parts.push(logoPart);
    
    return ai.models.generateContent({
      model,
      contents: { parts },
      config: { imageConfig: { aspectRatio: "16:9", imageSize: "1K" } },
    });
  });

  // Generate Thumbnail (1:1) with hooking copywriting
  const thumbnailText = `Create a professional 1:1 thumbnail for a blog post. 
          Topic: ${topic}. 
          Title: ${title}.
          Design: Center-aligned, bold, hooking Korean copywriting based on the topic. 
          The text should be the main focus, centered. 
          STRICTLY NO ENGLISH. ONLY KOREAN.
          Ensure Korean characters are perfect. If there's a risk of corruption, use fewer words.
          ${logoPart ? "CRITICAL: You MUST incorporate the provided brand logo image into this thumbnail design, ensuring it is 100% visible and correctly rendered." : ""}
          Modern, high-impact, emerald green accents.`;

  const thumbnailParts: any[] = [{ text: thumbnailText }];
  if (logoPart) thumbnailParts.push(logoPart);

  const thumbnailPromise = ai.models.generateContent({
    model,
    contents: { parts: thumbnailParts },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      },
    },
  });

  const [thumbnailResponse, ...infographicResponses] = await Promise.all([thumbnailPromise, ...infographicPromises]);

  const infographicUrls: string[] = [];
  for (const res of infographicResponses) {
    for (const part of res.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        infographicUrls.push(`data:image/png;base64,${part.inlineData.data}`);
        break;
      }
    }
  }

  let thumbnailUrl = "";
  for (const part of thumbnailResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      thumbnailUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  return { infographicUrls, thumbnailUrl };
};

export const generateBlogPost = async (request: BlogRequest, onProgress?: (step: string) => void): Promise<BlogResponse> => {
  const ai = getAI();
  const model = "gemini-3.1-pro-preview";

  onProgress?.('title');
  const titlePrompt = `
    '주식회사 더나아짐'의 블로그를 위한 SEO 최적화된 매력적인 제목을 하나 지어주세요.
    주제: ${request.topic}
    회사 정보: ${BETTERGIM_CONTEXT}
    응답은 제목 문자열만 보내주세요.
  `;
  const titleRes = await ai.models.generateContent({ model, contents: [{ text: titlePrompt }] });
  const title = titleRes.text?.trim() || request.topic;

  onProgress?.('body');
  const bodyPrompt = `
    당신은 '주식회사 더나아짐'의 공식 블로그 에디터이자 SEO 전문가입니다. 
    다음의 회사 정보를 바탕으로 검색엔진최적화(SEO)가 적용된 블로그 본문을 작성해주세요.

    [회사 정보]
    ${BETTERGIM_CONTEXT}

    [요청 사항]
    - 주제: ${request.topic}
    - 제목: ${title}
    - 타겟 독자: ${request.targetAudience}
    - 톤앤매너: ${request.tone === 'professional' ? '전문적이고 신뢰감 있는' : request.tone === 'friendly' ? '친근하고 따뜻한' : '정보 전달 중심의 명확한'}
    - 언어: 반드시 **한국어만** 사용하세요. 영어를 절대 사용하지 마세요.
    - **중요**: 본문 내용 중 '스포츠강좌이용권'에 대한 설명이 포함될 경우, 반드시 '스포츠강좌이용권'과 '장애인스포츠강좌이용권'을 서로 다른 항목이나 문단으로 명확히 분리하여 작성하세요. 두 제도의 차이점(대상, 혜택 등)이 잘 드러나도록 구분해야 합니다.

    [작성 구조 및 가이드라인]
    1. 서론 (Hook): 독자의 시선을 사로잡는 강력한 후킹성 카피라이팅으로 시작하세요.
    2. 본론 (Storytelling): 
       - 반드시 **4개의 소제목**을 작성하세요.
       - 각 소제목은 반드시 마크다운 인용구 형식(> 소제목 내용)을 사용하세요.
       - 주식회사 더나아짐의 차별화를 시각화하기 위한 **비교 표(Table)**를 반드시 포함하세요. 
       - **중요**: 표는 반드시 HTML <table> 태그를 사용하여 작성하세요. 각 <td>와 <th>에 테두리 스타일(border: 1px solid #e5e7eb; padding: 8px;)을 인라인으로 추가하여 복사 시에도 표 형태가 유지되게 하세요.
    3. 스타일링 (HTML 태그 사용):
       - 중요 텍스트: <b style="color: #2563eb;">내용</b> (파란색)
       - 강조 텍스트: <b style="color: #dc2626;">내용</b> (빨간색)
       - 강조 문단: <div style="background-color: #fef08a; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0;">문단 내용</div> (노란색 배경)
       - 핵심 내용: **굵게(Bold)** 처리
    4. 문장 구조: 각 문장이 끝날 때마다 반드시 줄바꿈을 두 번 하여 문단이 나뉘게 하세요.
    5. 결론 (CTA): 문의를 유도하는 강력한 문구로 마무리하세요.
    6. SEO: 관련 키워드를 자연스럽게 배치하고 해시태그를 포함하세요.

    응답은 마크다운 본문 내용만 보내주세요.
  `;

  const bodyRes = await ai.models.generateContent({ model, contents: [{ text: bodyPrompt }] });
  const body = bodyRes.text || "";

  onProgress?.('images');
  const images = await generateBlogImages(body, title, request.topic, request.logoBase64);

  onProgress?.('final');
  return {
    title,
    body,
    ...images
  };
};

export const suggestTopics = async () => {
  try {
    const ai = getAI();
    const model = "gemini-3-flash-preview";

    const prompt = `
      '주식회사 더나아짐'의 블로그를 위해 이번 달에 작성하기 좋은 블로그 포스팅 주제 5가지를 추천해주세요.
      회사 정보: ${BETTERGIM_CONTEXT}

      응답은 반드시 다음 JSON 형식을 따라야 합니다:
      [
        { "title": "주제 제목", "description": "주제 설명", "reason": "추천 이유" }
      ]
    `;

    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["title", "description", "reason"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error suggesting topics:", error);
    return [
      {
        title: "통합 교육의 미래",
        description: "장애와 비장애 아동이 함께하는 교육의 긍정적 영향",
        reason: "더나아짐의 핵심 가치를 알리기 위함"
      },
      {
        title: "스포츠 바우처 활용 꿀팁",
        description: "정부 지원 스포츠 바우처 신청 및 사용 방법 안내",
        reason: "학부모님들의 실질적인 궁금증 해소"
      }
    ];
  }
};
