const SITE_BASE='/professors-journal';
const $=selector=>document.querySelector(selector);
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories=['人物','学术','育人','艺文','协会动态','生活'];
const topics=['教学','研究','阅读','记忆'];
let entries=[],currentArticle=null,focusBeforeModal=null;
function readFilters(){
 const query=new URLSearchParams(location.search);
 return {category:query.get('category')||'',topic:query.get('topic')||'',issue:query.get('issue')||'',q:(query.get('q')||'').trim().slice(0,80),sort:query.get('sort')==='title'?'title':'index'};
}
function matches(item,filters){
 const text=[item.title,item.intro,item.category,...item.tags,...item.paragraphs].join(' ').toLocaleLowerCase('zh-CN');
 return (!filters.category||item.category===filters.category)&&(!filters.topic||item.tags.includes(filters.topic))&&(!filters.issue||item.issue===filters.issue)&&(!filters.q||text.includes(filters.q.toLocaleLowerCase('zh-CN')));
}
function selectedEntries(filters){
 return entries.filter(item=>matches(item,filters)).sort(filters.sort==='title'?(a,b)=>a.title.localeCompare(b.title,'zh-CN'):(a,b)=>a.index-b.index);
}
function filterButton(kind,value,label=value){
 return `<button type="button" data-kind="${kind}" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}
function updateFilterButtons(){
 const filters=readFilters();
 document.querySelectorAll('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(filters[button.dataset.kind]===button.dataset.value)));
 $('#clearFilters').hidden=!['category','topic','issue','q'].some(key=>filters[key]);
}
function setMenu(open){
 document.body.classList.toggle('menu-open',open);
 $('#mobileMenu').setAttribute('aria-expanded',String(open));
 $('#mobileMenu').textContent=currentArticle?'目录':open?'关闭':'菜单';
}
function navigate(url,replace=false){
 if(!url.startsWith(SITE_BASE+'/'))url=SITE_BASE+url;
 if(replace)history.replaceState({},'',url);else history.pushState({},'',url);
 setMenu(false);render();window.scrollTo(0,0);
}
function setFilter(kind,value){
 const filters=readFilters();const query=new URLSearchParams(location.search);
 if(filters[kind]===value)query.delete(kind);else query.set(kind,value);
 navigate('/'+(query.size?'?'+query.toString():''));
}
function card(item,index){
 return `<a class="archive-card" href="${item.url}" data-route style="animation-delay:${Math.min(index*12,100)}ms"><div class="card-image ${item.shape}"><img src="${item.image}" alt="${escapeHtml(item.title)}，平面插画" loading="${index<6?'eager':'lazy'}" decoding="async"></div><div class="card-info"><span class="card-code">(${item.code})</span><span class="card-title">${escapeHtml(item.title)}</span></div></a>`;
}
function renderArchive(){
 const filters=readFilters(),selected=selectedEntries(filters);
 const queryLabel=[filters.category,filters.topic,filters.q?`“${filters.q}”`:''].filter(Boolean).join(' / ');
 $('#main').innerHTML=`<section class="archive" aria-label="本期篇目"><h1 class="sr-only">上海市老教授协会电子刊 · 本期篇目</h1><div class="archive-tools"><p class="results">篇目：<span id="resultCount">${selected.length}</span></p><div class="sort-tools"><span>排序：</span><button type="button" id="sortToggle" aria-expanded="false" aria-controls="sortMenu">${filters.sort==='title'?'标题顺序':'刊内顺序'}</button><div class="sort-menu" id="sortMenu" role="menu" hidden><button type="button" role="menuitem" data-sort="index">刊内顺序</button><button type="button" role="menuitem" data-sort="title">标题顺序</button></div></div>${queryLabel?`<p class="active-query"><span>${escapeHtml(queryLabel)}</span><button type="button" data-clear>清除</button></p>`:''}</div>${selected.length?`<div class="archive-grid">${selected.map(card).join('')}</div>`:'<div class="empty"><p>暂无匹配篇目。</p><p>换一个关键词，或回到完整目录。</p><button type="button" data-clear>查看全部篇目</button></div>'}</section>`;
 $('#announcer').textContent=`当前显示 ${selected.length} 篇文章`;
}
function renderArticle(item){
 const previous=entries[(item.index-2+entries.length)%entries.length],next=entries[item.index%entries.length];
 const related=[item,...entries.filter(entry=>entry.slug!==item.slug).slice(0,5)];
 $('#main').innerHTML=`<article class="article" aria-label="${escapeHtml(item.title)}"><section class="article-stage"><div class="article-meta"><div><p>图：<br>平面插画</p><p>篇号：<br>(${item.code})</p></div><nav aria-label="前后篇目"><a href="${previous.url}" data-route>上一篇</a><span>/</span><a href="${next.url}" data-route>下一篇</a></nav></div><div class="article-mobile-title"><h2>${escapeHtml(item.title)}</h2><p>试刊 01 · ${escapeHtml(item.category)}</p></div><img class="article-art ${item.shape}" src="${item.image}" alt="${escapeHtml(item.title)}，ImageGen 平面插画"></section><div class="article-title-block"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.intro)}</p></div><section class="essay" aria-label="正文"><aside class="essay-info"><p>文字：<br>样刊编辑</p><p>栏目：<br>${escapeHtml(item.category)}</p><p>主题：<br>${item.tags.map(escapeHtml).join('、')}</p></aside><div class="essay-copy">${item.paragraphs.map(paragraph=>`<p>${escapeHtml(paragraph)}</p>`).join('')}<p class="article-note">本文及插画为样刊创作，不对应真实会员采访或已举办活动。正式刊用须以协会审定稿为准。</p><nav class="article-end" aria-label="文章导航"><a href="${SITE_BASE}/" data-route>返回目录</a><a href="${next.url}" data-route>下一篇：${escapeHtml(next.title)}</a></nav></div></section><aside class="article-rail" aria-label="本期目录"><p class="rail-title">本期目录</p>${related.map(entry=>`<a class="rail-card" href="${entry.url}" data-route ${entry.slug===item.slug?'aria-current="page"':''}><img src="${entry.image}" alt="" loading="lazy"><span>(${entry.code})</span><span>${escapeHtml(entry.title)}</span></a>`).join('')}<a href="${SITE_BASE}/" data-route>全部 12 篇</a></aside></article>`;
 $('#announcer').textContent=item.title;
}
function render(){
 const slug=location.pathname.slice(SITE_BASE.length).match(/^\/articles\/([a-z-]+)\/?$/)?.[1];
 currentArticle=slug?entries.find(item=>item.slug===slug):null;
 document.body.classList.toggle('body-article',Boolean(currentArticle));
 $('#returnIndex').hidden=!currentArticle;
 $('#mobileMenu').textContent=currentArticle?'目录':'菜单';
 $('#headerTitle').textContent=currentArticle?.title||'';
 document.title=(currentArticle?currentArticle.title:'篇目目录')+' — 师者 · 上海市老教授协会电子刊';
 updateFilterButtons();
 if(slug&&!currentArticle){$('#main').innerHTML='<div class="empty archive"><p>这篇文章暂未收录。</p><a href="${SITE_BASE}/" data-route>返回目录</a></div>';return}
 if(currentArticle)renderArticle(currentArticle);else renderArchive();
}
function closeModal(dialog){dialog.close();document.body.classList.remove('no-scroll');focusBeforeModal?.focus()}
function openModal(name){
 setMenu(false);focusBeforeModal=document.activeElement;
 const dialog=name==='search'?$('#searchDialog'):$('#aboutDialog');
 dialog.showModal();document.body.classList.add('no-scroll');
 if(name==='search'){$('#searchInput').value=readFilters().q;renderSuggestions();$('#searchInput').focus()}
}
function renderSuggestions(){
 const term=$('#searchInput').value.trim().slice(0,80);
 $('#suggestionHeading').textContent=term?'（相关篇目，回车检索全部）':'（建议检索）';
 if(!term){$('#suggestions').innerHTML=['教学','研究','阅读','记忆','公共','对话'].map(word=>`<button type="button" data-search="${word}">${word}</button>`).join('');return}
 const results=entries.filter(item=>matches(item,{q:term})).slice(0,6);
 $('#suggestions').innerHTML=results.length?results.map(item=>`<a href="${item.url}" data-route>${escapeHtml(item.title)}</a>`).join(''):'<p class="search-hint">暂无匹配篇目。试试“教学”或“阅读”。</p>';
}
function submitSearch(value){
 const q=value.trim().slice(0,80);closeModal($('#searchDialog'));
 navigate(q?'/?q='+encodeURIComponent(q):'/');
}
document.addEventListener('click',event=>{
 const target=event.target.closest('button,a');
 if(!target){const menu=$('#sortMenu');if(menu){menu.hidden=true;$('#sortToggle').setAttribute('aria-expanded','false')}return}
 if(target.matches('[data-modal]')){openModal(target.dataset.modal);return}
 if(target.matches('[data-close]')){closeModal(target.closest('dialog'));return}
 if(target.matches('[data-route],a.brand')){
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();document.querySelectorAll('dialog[open]').forEach(dialog=>closeModal(dialog));navigate(target.getAttribute('href'));return;
 }
 if(target.matches('[data-kind]')){setFilter(target.dataset.kind,target.dataset.value);return}
 if(target.matches('[data-clear],#clearFilters')){navigate('/');return}
 if(target.matches('[data-search]')){submitSearch(target.dataset.search);return}
 if(target.id==='mobileMenu'){if(currentArticle)navigate('/');else setMenu(!document.body.classList.contains('menu-open'));return}
 if(target.id==='returnIndex'){navigate('/');return}
 if(target.id==='backTop'){window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return}
 if(target.id==='sortToggle'){
  const open=target.getAttribute('aria-expanded')==='true';target.setAttribute('aria-expanded',String(!open));$('#sortMenu').hidden=open;return;
 }
 if(target.matches('[data-sort]')){const query=new URLSearchParams(location.search);query.set('sort',target.dataset.sort);navigate('/?'+query.toString());return}
 if($('#sortMenu')){$('#sortMenu').hidden=true;$('#sortToggle').setAttribute('aria-expanded','false')}
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'){
  setMenu(false);const menu=$('#sortMenu');if(menu){menu.hidden=true;$('#sortToggle').setAttribute('aria-expanded','false')}
 }
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>document.body.classList.remove('no-scroll')));
$('#searchForm').addEventListener('submit',event=>{event.preventDefault();submitSearch($('#searchInput').value)});
$('#searchInput').addEventListener('input',renderSuggestions);
window.addEventListener('popstate',()=>{setMenu(false);render()});
async function boot(){
 try{
  const response=await fetch(SITE_BASE+'/content.json');if(!response.ok)throw new Error('Content unavailable');entries=(await response.json()).map(item=>({...item,image:SITE_BASE+item.image,url:SITE_BASE+item.url}));
  $('#categoryFilters').innerHTML=categories.map(value=>filterButton('category',value)).join('');
  $('#topicFilters').innerHTML=topics.map(value=>filterButton('topic',value)).join('');
  render();
 }catch(error){$('#main').innerHTML='<div class="empty archive" role="alert"><p>目录暂时无法打开，请刷新页面。</p></div>';console.error('Unable to load local journal content.')}
}
boot();
