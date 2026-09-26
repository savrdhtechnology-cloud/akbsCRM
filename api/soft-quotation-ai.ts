import { GoogleGenAI } from '@google/genai';

const clean = (value: unknown) => JSON.stringify(value, null, 2);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action, quotation, approvedTemplate } = req.body || {};
  if (!action || !quotation || !approvedTemplate) {
    res.status(400).json({ error: 'Missing quotation context' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'AI service is not configured' });
    return;
  }

  const allowedActions = new Set([
    'project-details','overview','scope','technical','cost-explanation',
    'exclusions','commercial-notes','customer-summary','improve-language'
  ]);
  if (!allowedActions.has(action)) {
    res.status(400).json({ error: 'Unsupported AI action' });
    return;
  }

  const systemRules = `
You are an internal AKBS CRM quotation assistant.
Use ONLY the supplied user-entered quotation data and approved AKBS template.
Never invent prices, market rates, certifications, approvals, guarantees, dimensions or specifications.
Commercial numbers must come from the supplied quotation/template only.
If required information is missing, use the literal phrase "Requires Confirmation".
Return strict JSON only, without markdown.
For project-details return an object with: projectName, projectType, projectCapacity, projectUnit, shedSize, coveredArea, technology, technicalSpecifications, requiresConfirmation.
For every other action return: {"text":"...","requiresConfirmation":["..."]}.
Keep content professional, clear and suitable for a preliminary soft quotation.
`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: `${systemRules}

ACTION:
${action}

APPROVED TEMPLATE:
${clean(approvedTemplate)}

CURRENT QUOTATION / CRM DATA:
${clean(quotation)}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });
    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    res.status(200).json(parsed);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'AI generation failed' });
  }
}
