export const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]!));

export function csvCell(value:unknown){const text=String(value??'');const safe=/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)?"'"+text:text;return '"'+safe.replaceAll('"','""')+'"';}
