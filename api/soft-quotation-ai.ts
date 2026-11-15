import { checkOrigin, readBody, send, SecurityError, staff, upstream } from '../server/security';
import { GoogleGenAI } from '@google/genai';

const clean = (value: unknown) => JSON.stringify(value, null, 2);

export default async function handler(req: any, res: any) {
  try {
  if (req.method !== 'POST') {
    send(res,405,{ error: 'Method not allowed' });
    return;
  }

  checkOrigin(req);
  const {token,user}=await staff(req);
  if(!['ADMIN','MANAGER'].includes(user.role))throw new SecurityError('Manager access required.',403);
  const body=await readBody(req,131072);
  if(Object.keys(body).some(k=>!['action','quotation','approvedTemplate'].includes(k)))throw new SecurityError('Unexpected field.');
  const { action }=body;
  const list=await upstream('akbs_soft_quotation_workspace',{p_action:'list',p_data:{},p_token:token});
  const quotation=list.quotes?.find((q:any)=>q.id===body.quotation?.id);
  if(!quotation)throw new SecurityError('Select a saved quotation in your assigned scope.',404);
  const approvedTemplate={source:'Saved manager-reviewed quotation',projectName:quotation.projectName};
  await upstream('akbs_security_limit',{p_scope:'ai',p_token:token});
  if (!action || !quotation || !approvedTemplate) {
    send(res,400,{ error: 'Missing quotation context' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    send(res,503,{ error: 'AI service is not configured' });
    return;
  }

  const allowedActions = new Set([
    'project-details','overview','scope','technical','cost-explanation',
    'exclusions','commercial-notes','customer-summary','improve-language'
  ]);
  if (!allowedActions.has(action)) {
    send(res,400,{ error: 'Unsupported AI action' });
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
    send(res,200,parsed);
  } catch (error: any) {
    send(res,500,{ error: 'AI generation failed. Please try again.' });
  }
  } catch(error) {const e=error instanceof SecurityError?error:new SecurityError('Unable to process request.',500);send(res,e.status,{error:e.message});}
}
