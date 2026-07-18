const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","access-control-allow-origin":"*","access-control-allow-headers":"content-type,x-otl-user","access-control-allow-methods":"GET,POST,DELETE,OPTIONS"}});
const uid=()=>crypto.randomUUID();
const clean=(v,n=500)=>String(v??"").replace(/[<>]/g,"").trim().slice(0,n);
const bad=["discord.gg/","bit.ly/","tinyurl","password","cookie","token","login code","verification code"];
const blocked=t=>bad.some(x=>String(t).toLowerCase().includes(x));
const user=req=>clean(req.headers.get("x-otl-user")||"",24);
export default {async fetch(req,env){
  if(req.method==="OPTIONS")return json({ok:true});
  const u=new URL(req.url),path=u.pathname.replace(/^\/api/,"");
  if(path==="/health")return json({ok:true});
  const who=user(req); if(!who)return json({error:"Missing display name"},400);
  try{
    if(path==="/listings"&&req.method==="GET"){
      const now=Date.now();
      const {results}=await env.DB.prepare("SELECT * FROM listings WHERE status='open' AND expires>? ORDER BY created DESC LIMIT 200").bind(now).all();
      for(const x of results){x.give=JSON.parse(x.give_json);x.want=JSON.parse(x.want_json);delete x.give_json;delete x.want_json;if(x.type==='auction'){const b=await env.DB.prepare("SELECT bidder,items_json,value,created FROM bids WHERE listing_id=? ORDER BY value DESC,created ASC LIMIT 50").bind(x.id).all();x.bids=b.results.map(v=>({...v,items:JSON.parse(v.items_json)}))}}
      return json({listings:results});
    }
    if(path==="/listings"&&req.method==="POST"){
      const b=await req.json(),id=uid(),type=b.type==='auction'?'auction':'trade',title=clean(b.title,70),description=clean(b.description,500),give=Array.isArray(b.give)?b.give.slice(0,8):[],want=Array.isArray(b.want)?b.want.slice(0,8):[],created=Date.now(),expires=Math.min(created+7*864e5,Number(b.expires)||created+864e5);
      if(!title||!give.length||blocked(title+' '+description))return json({error:"Invalid or blocked listing"},400);
      await env.DB.prepare("INSERT INTO listings(id,type,owner,title,description,give_json,want_json,created,expires) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,type,who,title,description,JSON.stringify(give),JSON.stringify(want),created,expires).run();
      return json({ok:true,id});
    }
    const lm=path.match(/^\/listings\/([^/]+)$/);
    if(lm&&req.method==="DELETE"){
      await env.DB.prepare("UPDATE listings SET status='removed' WHERE id=? AND owner=?").bind(lm[1],who).run();return json({ok:true});
    }
    const am=path.match(/^\/listings\/([^/]+)\/accept$/);
    if(am&&req.method==="POST"){
      const row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND status='open'").bind(am[1]).first();if(!row)return json({error:"Listing unavailable"},404);if(row.owner===who)return json({error:"Cannot accept your own listing"},400);
      const room=uid(),created=Date.now();await env.DB.batch([
        env.DB.prepare("UPDATE listings SET status='accepted' WHERE id=?").bind(row.id),
        env.DB.prepare("INSERT INTO rooms(id,listing_id,title,members_json,created) VALUES(?,?,?,?,?)").bind(room,row.id,row.title,JSON.stringify([row.owner,who]),created),
        env.DB.prepare("INSERT INTO messages(id,room_id,author,body,created) VALUES(?,?,?,?,?)").bind(uid(),room,"Ohio Trade Lab","Trade accepted. Coordinate the in-game trade here. Never share passwords or login codes.",created),
        env.DB.prepare("INSERT INTO notifications(id,recipient,body,room_id,created) VALUES(?,?,?,?,?)").bind(uid(),row.owner,`${who} accepted your trade: ${row.title}`,room,created)
      ]);return json({ok:true,room});
    }
    const bm=path.match(/^\/listings\/([^/]+)\/bid$/);
    if(bm&&req.method==="POST"){
      const b=await req.json(),items=Array.isArray(b.items)?b.items.slice(0,8):[];if(!items.length)return json({error:"Bid needs items"},400);
      const row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND type='auction' AND status='open' AND expires>?").bind(bm[1],Date.now()).first();if(!row)return json({error:"Auction unavailable"},404);
      await env.DB.prepare("INSERT INTO bids(id,listing_id,bidder,items_json,value,created) VALUES(?,?,?,?,?,?)").bind(uid(),row.id,who,JSON.stringify(items),Number(b.value)||0,Date.now()).run();return json({ok:true});
    }
    if(path==="/notifications"&&req.method==="GET"){
      const {results}=await env.DB.prepare("SELECT * FROM notifications WHERE recipient=? ORDER BY created DESC LIMIT 100").bind(who).all();return json({notifications:results});
    }
    const rm=path.match(/^\/rooms\/([^/]+)$/);
    if(rm&&req.method==="GET"){
      const room=await env.DB.prepare("SELECT * FROM rooms WHERE id=?").bind(rm[1]).first();if(!room)return json({error:"Room missing"},404);const members=JSON.parse(room.members_json);if(!members.includes(who))return json({error:"Private room"},403);const {results}=await env.DB.prepare("SELECT author,body,created FROM messages WHERE room_id=? ORDER BY created ASC LIMIT 500").bind(room.id).all();return json({room:{...room,members,messages:results}});
    }
    const mm=path.match(/^\/rooms\/([^/]+)\/messages$/);
    if(mm&&req.method==="POST"){
      const room=await env.DB.prepare("SELECT * FROM rooms WHERE id=?").bind(mm[1]).first();if(!room)return json({error:"Room missing"},404);if(!JSON.parse(room.members_json).includes(who))return json({error:"Private room"},403);const b=await req.json(),body=clean(b.body,300);if(!body||blocked(body))return json({error:"Message blocked"},400);await env.DB.prepare("INSERT INTO messages(id,room_id,author,body,created) VALUES(?,?,?,?,?)").bind(uid(),room.id,who,body,Date.now()).run();return json({ok:true});
    }
    return json({error:"Not found"},404);
  }catch(e){return json({error:"Server error",detail:String(e?.message||e)},500)}
}};
