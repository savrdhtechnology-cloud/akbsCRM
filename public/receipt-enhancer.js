(() => {
  const nativeOpen = window.open.bind(window);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  window.open = function(url, target, features) {
    const child = nativeOpen(url, target, features);
    if (!child || url) return child;

    const nativeWrite = child.document.write.bind(child.document);
    child.document.write = function(html) {
      if (typeof html !== 'string' || !html.includes('<title>AKBS Receipt</title>')) {
        return nativeWrite(html);
      }

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fields = {};
      parsed.querySelectorAll('.row').forEach(row => {
        const key = row.querySelector('b')?.textContent?.trim() || '';
        const value = row.querySelector('span')?.textContent?.trim() || '';
        if (key) fields[key] = value;
      });
      const amount = parsed.querySelector('.amt')?.textContent?.trim() || '₹0';
      const receiptNo = `AKBS-RCP-${(fields.Application || 'NA').replace(/[^A-Za-z0-9]/g,'').slice(-10)}-${Date.now().toString().slice(-6)}`;
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const status = fields.Status || 'VERIFIED';

      const premium = `<!doctype html><html><head><meta charset="utf-8"><title>AKBS Payment Receipt</title>
      <style>
        @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef4f0;color:#18382d;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{width:100%;max-width:760px;margin:0 auto;background:#fff;min-height:270mm;border:1px solid #d9e7df;position:relative;overflow:hidden}.topline{height:7px;background:#0b6b45}.header{padding:30px 34px 24px;background:linear-gradient(135deg,#063b29,#0a6a46);color:#fff;display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.brand{font-size:23px;font-weight:800;letter-spacing:.1px}.tag{font-size:11px;opacity:.82;margin-top:7px}.title{text-align:right}.title h1{font-size:24px;margin:0 0 8px;letter-spacing:1.2px}.verified{display:inline-block;padding:7px 12px;border-radius:999px;background:#dff7e9;color:#08633f;font-size:11px;font-weight:800;letter-spacing:.5px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:24px 34px 0}.metaBox{border:1px solid #dce8e1;border-radius:12px;padding:14px 16px;background:#f9fcfa}.label{font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#6c8279;font-weight:700;margin-bottom:5px}.value{font-size:13px;font-weight:700;color:#18382d}.amountBox{margin:20px 34px;background:#edf8f2;border:1px solid #cce8da;border-radius:14px;padding:20px 22px;display:flex;align-items:center;justify-content:space-between}.amountBox .amount{font-size:34px;font-weight:900;color:#087849}.amountBox .paid{font-size:12px;font-weight:800;color:#087849}.section{margin:0 34px 20px;border:1px solid #dce8e1;border-radius:14px;overflow:hidden}.sectionTitle{padding:12px 16px;background:#f3f8f5;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.6px}.row2{display:grid;grid-template-columns:42% 58%;padding:12px 16px;border-top:1px solid #edf2ef;font-size:12px}.row2 span:first-child{color:#70857c}.row2 span:last-child{font-weight:700;text-align:right;overflow-wrap:anywhere}.note{margin:0 34px 18px;padding:14px 16px;border-left:4px solid #0a6a46;background:#f7faf8;font-size:11px;line-height:1.55;color:#526b61}.footer{margin:28px 34px 0;padding:18px 0 24px;border-top:1px solid #dce8e1;display:flex;justify-content:space-between;gap:20px;font-size:10px;color:#6c8279;line-height:1.55}.footer strong{color:#18382d}.site{color:#087849;font-weight:800}.stamp{text-align:right}.watermark{position:absolute;right:-30px;bottom:70px;font-size:78px;font-weight:900;color:rgba(7,120,73,.035);transform:rotate(-18deg);pointer-events:none}@media print{body{background:#fff}.page{border:none;min-height:auto}button{display:none!important}}
      </style></head><body><div class="page"><div class="topline"></div><header class="header"><div><div class="brand">AKBS Poultry Farming Pvt. Ltd.</div><div class="tag">Official Payment Acknowledgement</div></div><div class="title"><h1>PAYMENT RECEIPT</h1><span class="verified">✓ ${esc(status)}</span></div></header>
      <div class="meta"><div class="metaBox"><div class="label">Receipt No.</div><div class="value">${esc(receiptNo)}</div></div><div class="metaBox"><div class="label">Receipt Generated</div><div class="value">${esc(now)}</div></div></div>
      <div class="amountBox"><div><div class="label">Amount Received</div><div class="amount">${esc(amount)}</div></div><div class="paid">PAYMENT VERIFIED</div></div>
      <section class="section"><div class="sectionTitle">Customer & Application</div><div class="row2"><span>Customer Name</span><span>${esc(fields.Customer || '—')}</span></div><div class="row2"><span>Application ID</span><span>${esc(fields.Application || '—')}</span></div><div class="row2"><span>Service / Fee Type</span><span>${esc(fields.Service || '—')}</span></div></section>
      <section class="section"><div class="sectionTitle">Payment Details</div><div class="row2"><span>UTR / Transaction Reference</span><span>${esc(fields['Transaction Ref'] || '—')}</span></div><div class="row2"><span>Payment Status</span><span>${esc(status)}</span></div><div class="row2"><span>Received By</span><span>AKBS Poultry Farming Pvt. Ltd.</span></div></section>
      <div class="note"><strong>Important:</strong> This is a system-generated payment receipt issued after payment verification in the AKBS CRM. Please retain this receipt for your records. This receipt acknowledges the payment shown above and does not by itself constitute approval of any separate project, finance or service application.</div>
      <footer class="footer"><div><strong>AKBS Poultry Farming Pvt. Ltd.</strong><br>Silwani, District Raisen, Madhya Pradesh, India<br><span class="site">www.akbspoultry.com</span></div><div class="stamp"><strong>Digitally Generated Receipt</strong><br>No physical signature required.<br>Generated through AKBS CRM Fee Management</div></footer><div class="watermark">AKBS</div></div><script>window.onload=()=>setTimeout(()=>window.print(),150)<\/script></body></html>`;
      return nativeWrite(premium);
    };
    return child;
  };
})();
