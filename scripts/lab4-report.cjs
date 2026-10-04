// Render the review report from tracked Markdown and ignored evidence images.
// Run from the repository root: node scripts/lab4-report.cjs
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs/lab-04');
const reportRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const out = path.join(root, 'output/pdf');
const source = path.join(docs, 'report.md');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function href(value) {
  if (/^https:\/\//.test(value)) return value;
  const [file, anchor] = value.split('#');
  const target = path.resolve(docs, file);
  if (!fs.existsSync(target)) throw Error(`Missing link target: ${value}`);
  return 'https://github.com/BOOky-OS/toktickit/blob/' + reportRef + '/' + path.relative(root, target).split(path.sep).join('/') + (anchor ? '#' + anchor : '');
}
function inline(value) {
  return escape(value)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, target) => `<a href="${escape(href(target.replaceAll('&amp;', '&')))}">${text}</a>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function excerpt(_, file, start, end) {
  const text = read(path.join(docs, file));
  const a = text.indexOf(start);
  const b = end === 'END' ? text.length : text.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error(`Excerpt not found in ${file}: ${start} / ${end}`);
  return `\n${text.slice(a, b).trim()}\n`;
}
function image(file, caption) {
  const target = path.resolve(docs, file);
  const bytes = fs.readFileSync(target);
  return `<figure><img src="data:image/png;base64,${bytes.toString('base64')}" alt="${escape(caption)}"><figcaption>${escape(caption)}</figcaption></figure>`;
}
function markdown(text) {
  const lines = text.split('\n'); let result = '', table = [], paragraph = [], list = false, code = null;
  const flushParagraph = () => { if(paragraph.length) { result += `<p>${inline(paragraph.join(' '))}</p>`; paragraph=[]; } };
  const flushTable = () => { if(!table.length) return; result += '<table>'; table.forEach((row,i) => { if (/^\|[\s:|-]+\|$/.test(row)) return; const cells=row.replace(/^\||\|$/g,'').split('|'); result += `<tr>${cells.map(cell=>`<${i ? 'td' : 'th'}>${inline(cell.trim())}</${i ? 'td' : 'th'}>`).join('')}</tr>`; }); result+='</table>';table=[]; };
  const closeList = () => { if(list) { result+='</ul>';list=false; } };
  for(const line of lines) {
    if(line.startsWith('```')) { flushParagraph();flushTable();closeList(); if(code===null) code=[]; else { result+=`<pre>${escape(code.join('\n'))}</pre>`;code=null; } continue; }
    if(code!==null) { code.push(line);continue; }
    if(line.startsWith('|')) {flushParagraph();closeList();table.push(line);continue;} flushTable();
    if(!line.trim()) {flushParagraph();closeList();continue;}
    const heading=line.match(/^(#{1,4}) (.*)/); if(heading) {flushParagraph();closeList(); const part=/^Answer Part \d$/.test(heading[2]); result+=`<h${heading[1].length} class="${part?'part':''}">${inline(heading[2])}</h${heading[1].length}>`;continue;}
    const pic=line.match(/^!\[(.*)\]\((.*)\)$/);if(pic){flushParagraph();closeList();result+=image(pic[2],pic[1]);continue;}
    if(/^[-*] /.test(line)) {flushParagraph();if(!list){result+='<ul>';list=true;}result+=`<li>${inline(line.slice(2))}</li>`;continue;}
    if(line.startsWith('>')) {flushParagraph();closeList();result+=`<blockquote>${inline(line.replace(/^> ?/,''))}</blockquote>`;continue;}
    paragraph.push(line);
  }
  flushParagraph();flushTable();closeList();return result;
}
(async () => {
  fs.mkdirSync(out,{recursive:true});
  let text = read(source).replace(/\{\{excerpt:([^:}]+):(.+?):(.+?)\}\}/g,excerpt);
  let body = markdown(text);
  const html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>TokTickIT Lab 4 - review draft</title><style>
  @page{size:A4;margin:16mm 15mm 17mm}*{box-sizing:border-box}body{font:10pt/1.45 Arial,sans-serif;color:#203b32}h1{font-size:24pt;color:#075438}h2{font-size:17pt;color:#075438;border-bottom:2px solid #b8d8c8;padding-bottom:6pt}h3{font-size:12pt}h1,h2,h3,h4{break-after:avoid}h2.part,.gallery-heading{break-before:page}h2.part:first-of-type{break-before:auto}a{color:#087449;text-decoration:underline;overflow-wrap:anywhere}p,li{orphans:3;widows:3}table{width:100%;border-collapse:collapse;font-size:8.5pt;margin:10pt 0}th{background:#e9f4ef;text-align:left}td:first-child,th:first-child{min-width:28pt}td,th{border:1px solid #bed3c8;padding:5pt;vertical-align:top;overflow-wrap:anywhere}tr{break-inside:avoid}code{font:8.3pt Consolas,monospace;overflow-wrap:anywhere}pre{font:8.5pt/1.4 Consolas,monospace;white-space:pre-wrap;background:#eef5f1;padding:10pt}blockquote{border-left:3px solid #8bb59f;padding-left:10pt;margin:5pt 0;color:#385b4c}figure{margin:14pt 0;break-inside:avoid}img{display:block;max-width:100%;max-height:165mm;width:auto;height:auto;margin:auto;border:1px solid #d0ddd6}figcaption{font-size:9pt;color:#486052;margin-top:6pt}ul{padding-left:16pt}
  </style><body>${body}</body></html>`;
  fs.writeFileSync(path.join(out,'toktickit-lab4-review.html'),html);
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try { const page=await browser.newPage();await page.setContent(html,{waitUntil:'load'});
  await page.evaluate(() => {
    for(const img of document.images) {
      const w=img.naturalWidth,h=img.naturalHeight;
      const limit=/Create action/.test(img.alt)?1150:w<500?1050:w<1000?850:1000;
      if(h>limit) {
        const caption=img.alt;
        const detail=/Create action|Workflow blocked|Actions list/.test(caption);
        const fraction=/Create action/.test(caption)?0.40:/Workflow blocked/.test(caption)?0.27:/Actions list/.test(caption)?0.44:0;
        const y=Math.min(h-limit,Math.round(h*fraction));
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=limit;
        canvas.getContext('2d').drawImage(img,0,y,w,limit,0,0,w,limit);
        img.src=canvas.toDataURL('image/png');
        img.parentElement.querySelector('figcaption').textContent += detail ? ' - detail crop; full capture retained locally.' : ' - top-page crop; full capture retained locally.';
      }
      img.style.width=w<500?'65mm':w<1000?'145mm':'180mm';
    }
  });
  await page.waitForFunction(() => Array.from(document.images).every(i=>i.complete));
  await page.pdf({path:path.join(out,'toktickit-lab4-review.pdf'),format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font:8px Arial;color:#547062">Lab 4 | STUDENT REVIEW DRAFT | <span class="pageNumber"></span> / <span class="totalPages"></span></div>',preferCSSPageSize:true}); } finally {await browser.close();}
  console.log('Created output/pdf/toktickit-lab4-review.pdf');
})().catch(error=>{console.error(error);process.exitCode=1;});
