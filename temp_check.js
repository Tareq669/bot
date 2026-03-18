const axios=require('axios');
(async()=>{
 const id='mUC-Um5Jauw';
 const r=await axios.get('https://r.jina.ai/http://www.youtube.com/watch?v='+id,{timeout:12000});
 const text=String(r.data||'');
 console.log('len',text.length);
 console.log(text.includes('audio'), text.includes('signature'));
 const m = text.match(/https?:\/\/[^\s"\']*?(?:m[0-9]+)?\.googlevideo\.com[^\s"\']+/i);
 console.log('match', m && m[0]);
})();
