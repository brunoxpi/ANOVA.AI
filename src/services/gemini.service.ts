import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export interface PersonalData {
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  rg: string;
  orgaoEmissor: string;
  dataExpedicao: string;
  nomeMae: string;
  nomePai: string;
}

export interface AddressData {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface CopilotResponse {
  analysis: string;
  recommendedAssetIds: string[];
}

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async fileToGenerativePart(file: File) {
    const base64EncodedDataPromise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  }

  async analyzeDocument(file: File): Promise<PersonalData> {
    const filePart = await this.fileToGenerativePart(file);
    const textPart = {
      text: 'Extraia as seguintes informações deste documento de identificação (RG ou CNH). Formate a resposta como JSON usando o schema fornecido.',
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        nomeCompleto: { type: Type.STRING },
        cpf: { type: Type.STRING },
        dataNascimento: { type: Type.STRING },
        rg: { type: Type.STRING },
        orgaoEmissor: { type: Type.STRING },
        dataExpedicao: { type: Type.STRING },
        nomeMae: { type: Type.STRING },
        nomePai: { type: Type.STRING },
      },
    };

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, filePart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
        throw new Error("API returned an empty response.");
    }

    try {
        return JSON.parse(jsonString) as PersonalData;
    } catch(e) {
        console.error("Failed to parse JSON response:", jsonString);
        throw new Error("Invalid JSON format in API response.");
    }
  }

  async analyzeAddressDocument(file: File): Promise<AddressData> {
    const filePart = await this.fileToGenerativePart(file);
    const textPart = {
      text: 'Extraia as seguintes informações deste comprovante de endereço. Formate a resposta como JSON usando o schema fornecido.',
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        cep: { type: Type.STRING },
        endereco: { type: Type.STRING },
        bairro: { type: Type.STRING },
        cidade: { type: Type.STRING },
        estado: { type: Type.STRING },
      },
      required: ['cep', 'endereco', 'bairro', 'cidade', 'estado'],
    };

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, filePart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
        throw new Error("API returned an empty response.");
    }

    try {
        return JSON.parse(jsonString) as AddressData;
    } catch(e) {
        console.error("Failed to parse JSON response:", jsonString);
        throw new Error("Invalid JSON format in API response.");
    }
  }

  async transcribeAudio(file: File): Promise<string> {
    const audioPart = await this.fileToGenerativePart(file);
    const textPart = {
      text: "Transcreva esta gravação de áudio com precisão. O áudio contém notas sobre os objetivos de investimento de um cliente.",
    };

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, audioPart] },
    });

    return response.text.trim();
  }

  async getAssetRecommendations(userPrompt: string): Promise<CopilotResponse> {
    const systemInstruction = `Você é um assistente de investimentos da Anova. Sua análise de mercado atual é que o ciclo de alta de juros nos mercados globais está próximo do fim. Portanto, você deve priorizar a recomendação de títulos de renda fixa pré-fixados de longo prazo, pois eles tendem a se valorizar nesse cenário. Para perfis de risco mais agressivos, você pode sugerir uma alocação minoritária em ações de setores resilientes, como utilities e consumo básico. Sempre responda com uma breve análise da sua sugestão, seguida por um JSON estritamente no formato do schema fornecido.`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            analysis: { 
              type: Type.STRING,
              description: 'Sua breve análise sobre a recomendação de ativos.' 
            },
            recommendedAssetIds: {
                type: Type.ARRAY,
                description: 'Uma lista de IDs de ativos recomendados.',
                items: { type: Type.STRING }
            }
        },
        required: ['analysis', 'recommendedAssetIds']
    };

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 32768 },
      },
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
        throw new Error("API returned an empty response.");
    }

    try {
        return JSON.parse(jsonString) as CopilotResponse;
    } catch(e) {
        console.error("Failed to parse JSON response:", jsonString);
        throw new Error("Invalid JSON format in API response.");
    }
  }
}