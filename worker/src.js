const enc = new TextEncoder();
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":"*","access-control-allow-headers":"content-type,authorization,x-admin-key","access-control-allow-methods":"GET,POST,DELETE,OPTIONS",...extra}});
const envText=(env,name)=>String((env&&env[name])??"").trim();
const hasEnv=(env,name)=>envText(env,name).length>0;
const oauthStatus=env=>({
 googleClientId:hasEnv(env,"GOOGLE_CLIENT_ID"),
 googleClientSecret:hasEnv(env,"GOOGLE_CLIENT_SECRET"),
 discordClientId:hasEnv(env,"DISCORD_CLIENT_ID"),
 discordClientSecret:hasEnv(env,"DISCORD_CLIENT_SECRET"),
 publicSiteUrl:hasEnv(env,"PUBLIC_SITE_URL"),
 sessionSecret:hasEnv(env,"SESSION_SECRET"),
 ownerEmails:hasEnv(env,"OWNER_EMAILS"),
 databaseBound:Boolean(env&&env.DB&&typeof env.DB.prepare==="function")
});
const cookieValue=(req,name)=>(req.headers.get("cookie")||"").match(new RegExp("(?:^|;\\s*)"+name+"=([^;]+)"))?.[1]||"";
const sessionCookie=(token,maxAge=2592000)=>`otl_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const clearSessionCookie=()=>"otl_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const adminCookie=(token,maxAge=28800)=>`otl_admin=${encodeURIComponent(token)}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const clearAdminCookie=()=>"otl_admin=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
const safeSite=(env,url)=>{
 const configured=envText(env,"PUBLIC_SITE_URL").replace(/\/$/,"");
 if(configured&&!/your[-.]actual[-.]domain/i.test(configured)){try{const u=new URL(configured);if(u.protocol==="https:")return u.origin}catch{}}
 return url.origin;
};
const oauthCookie=(name,value,maxAge=600)=>`${name}=${encodeURIComponent(value)}; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const clearOauthCookie=name=>`${name}=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
const redirectWithCookies=(location,cookies=[])=>{const h=new Headers({location,"cache-control":"no-store"});for(const c of cookies)h.append("set-cookie",c);return new Response(null,{status:302,headers:h})};
const oauthFail=(env,url,message)=>new Response(null,{status:302,headers:{location:`${safeSite(env,url)}/?auth_error=${encodeURIComponent(message)}#online`}});
const uid=()=>crypto.randomUUID();
const clean=(v,n=500)=>String(v??"").replace(/[<>]/g,"").trim().slice(0,n);
const normalizeEmail=v=>clean(v,254).toLowerCase();
const normalizeUsername=v=>clean(v,20).toLowerCase().replace(/[^a-z0-9_]/g,"");
const bad=[/discord\.gg/i,/bit\.ly/i,/tinyurl/i,/password/i,/passcode/i,/login\s*code/i,/verification\s*code/i,/cookie/i,/credit\s*card/i,/cashapp/i,/venmo/i,/paypal/i,/home\s*address/i,/phone\s*number/i,/dox/i,/kill\s*yourself/i];
const blocked=t=>bad.some(r=>r.test(String(t)));
const b64u=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
const unb64u=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((s.length+3)%4)),c=>c.charCodeAt(0));
async function hmac(secret,text){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(text)))}
async function tokenFor(env,user){const payload=b64u(enc.encode(JSON.stringify({sub:user.id,exp:Date.now()+30*864e5})));return payload+"."+b64u(await hmac(env.SESSION_SECRET,payload))}
async function auth(req,env){const raw=decodeURIComponent(cookieValue(req,"otl_session")||"")||(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");if(!raw)return null;const [p,s]=raw.split(".");if(!p||!s)return null;const expected=await hmac(env.SESSION_SECRET,p);const got=unb64u(s);if(expected.length!==got.length)return null;let ok=true;for(let i=0;i<got.length;i++)ok&&=expected[i]===got[i];if(!ok)return null;let data;try{data=JSON.parse(new TextDecoder().decode(unb64u(p)))}catch{return null}if(data.exp<Date.now())return null;return env.DB.prepare("SELECT id,email,username,display_name,avatar,bio,provider,role,status FROM users WHERE id=? AND status='active'").bind(data.sub).first()}
async function hashPassword(password,salt){const base=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:210000},base,256);return b64u(new Uint8Array(bits))}
const publicUser=u=>({id:u.id,username:u.username,displayName:u.display_name,avatar:u.avatar||"/assets/default-avatar.svg",bio:u.bio||'',role:u.role});
const privateUser=u=>({...publicUser(u),email:u.email,provider:u.provider});
const roleNames=new Set(['user','staff','developer']);
const ownerEmails=env=>new Set(String(env.OWNER_EMAILS||'').split(',').map(normalizeEmail).filter(Boolean));
async function applyVerifiedOwnerRole(env,user,email,isVerified){if(!user||!isVerified)return user;const normalized=normalizeEmail(email);if(normalized&&ownerEmails(env).has(normalized)&&user.role!=='developer'){await env.DB.prepare("UPDATE users SET role='developer' WHERE id=?").bind(user.id).run();user=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(user.id).first()}return user}

async function ensureCoreSchema(env){
 const statements=[
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    password_hash TEXT,
    password_salt TEXT,
    provider TEXT NOT NULL CHECK(provider IN ('email','google','discord')),
    provider_id TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('trade','auction')),
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    give_json TEXT NOT NULL DEFAULT '[]',
    want_json TEXT NOT NULL DEFAULT '[]',
    category TEXT NOT NULL DEFAULT '',
    preferred_section TEXT NOT NULL DEFAULT '',
    preferred_set TEXT NOT NULL DEFAULT '',
    min_bid_value INTEGER NOT NULL DEFAULT 0,
    max_bid_value INTEGER NOT NULL DEFAULT 0,
    buyout_json TEXT NOT NULL DEFAULT '[]',
    accepted_by TEXT,
    created INTEGER NOT NULL,
    expires INTEGER NOT NULL,
    completed INTEGER,
    status TEXT NOT NULL DEFAULT 'open',
    winning_bid_id TEXT,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_listings_status_expires ON listings(status,expires)`,
  `CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    bidder_id TEXT NOT NULL,
    items_json TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL,
    FOREIGN KEY(listing_id) REFERENCES listings(id),
    FOREIGN KEY(bidder_id) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_bids_listing_value ON bids(listing_id,value DESC,created ASC)`,
  `CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    title TEXT NOT NULL,
    member_a TEXT NOT NULL,
    member_b TEXT NOT NULL,
    created INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    FOREIGN KEY(member_a) REFERENCES users(id),
    FOREIGN KEY(member_b) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created INTEGER NOT NULL,
    system INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(room_id) REFERENCES rooms(id),
    FOREIGN KEY(author_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,
    room_id TEXT,
    created INTEGER NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(recipient_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_inventory (
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated INTEGER NOT NULL,
    PRIMARY KEY(user_id,item_id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_user ON user_inventory(user_id)`,
  `CREATE TABLE IF NOT EXISTS presence (
    visitor_id TEXT PRIMARY KEY,
    user_id TEXT,
    kind TEXT NOT NULL CHECK(kind IN ('guest','user','staff')),
    last_seen INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen)`
 ];
 for(const sql of statements) await env.DB.prepare(sql).run();
 const alters=[
  "ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE listings ADD COLUMN max_bid_value INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE listings ADD COLUMN buyout_json TEXT NOT NULL DEFAULT '[]'",
  "ALTER TABLE listings ADD COLUMN accepted_by TEXT"
 ];
 for(const sql of alters)try{await env.DB.prepare(sql).run()}catch(e){if(!/duplicate column|already exists/i.test(String(e)))throw e}
}
async function adminTokenFor(env,user){const payload=b64u(enc.encode(JSON.stringify({sub:user.id,scope:'admin',exp:Date.now()+8*60*60*1000})));return payload+'.'+b64u(await hmac(env.SESSION_SECRET,payload))}
async function adminUnlocked(req,env,user){const raw=String(req.headers.get('x-admin-key')||'').trim();if(!raw||!user)return false;const [p,s]=raw.split('.');if(!p||!s)return false;const expected=await hmac(env.SESSION_SECRET,p);const got=unb64u(s);if(expected.length!==got.length)return false;let ok=true;for(let i=0;i<got.length;i++)ok&&=expected[i]===got[i];if(!ok)return false;try{const d=JSON.parse(new TextDecoder().decode(unb64u(p)));return d.scope==='admin'&&d.sub===user.id&&d.exp>Date.now()}catch{return false}}
async function replaceInventory(env,userId,rows){const cleanRows=[];for(const r of Array.isArray(rows)?rows.slice(0,1000):[]){const id=clean(r.id||r.itemId,120);const q=Math.max(0,Math.min(999,Math.floor(Number(r.quantity)||0)));if(id&&q)cleanRows.push({id,q})}await env.DB.prepare('DELETE FROM user_inventory WHERE user_id=?').bind(userId).run();if(cleanRows.length){const now=Date.now();for(let i=0;i<cleanRows.length;i+=50){await env.DB.batch(cleanRows.slice(i,i+50).map(r=>env.DB.prepare('INSERT INTO user_inventory(user_id,item_id,quantity,updated) VALUES(?,?,?,?)').bind(userId,r.id,r.q,now)))}}return cleanRows}
async function decrementInventory(env,userId,ids){const counts={};for(const raw of Array.isArray(ids)?ids:[]){const id=clean(raw,120);if(id)counts[id]=(counts[id]||0)+1}for(const [id,q] of Object.entries(counts))await env.DB.prepare('UPDATE user_inventory SET quantity=MAX(0,quantity-?),updated=? WHERE user_id=? AND item_id=?').bind(q,Date.now(),userId,id).run()}


async function ensurePresenceTable(env){await env.DB.prepare("CREATE TABLE IF NOT EXISTS presence (visitor_id TEXT PRIMARY KEY,user_id TEXT,kind TEXT NOT NULL CHECK(kind IN ('guest','user','staff')),last_seen INTEGER NOT NULL)").run();await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen)").run()}
async function finalizeAuctions(env){const now=Date.now();const {results}=await env.DB.prepare("SELECT * FROM listings WHERE type='auction' AND status='open' AND expires<=? LIMIT 100").bind(now).all();for(const row of results){const bid=await env.DB.prepare("SELECT * FROM bids WHERE listing_id=? ORDER BY value DESC,created ASC LIMIT 1").bind(row.id).first();if(!bid){await env.DB.prepare("UPDATE listings SET status='ended_no_bids' WHERE id=? AND status='open'").bind(row.id).run();continue}const room=uid(),created=Date.now();await env.DB.batch([env.DB.prepare("UPDATE listings SET status='delivery_pending',winning_bid_id=? WHERE id=? AND status='open'").bind(bid.id,row.id),env.DB.prepare("INSERT INTO rooms(id,listing_id,title,member_a,member_b,created,status) VALUES(?,?,?,?,?,?,?)").bind(room,row.id,row.title,row.owner_id,bid.bidder_id,created,"open"),env.DB.prepare("INSERT INTO messages(id,room_id,author_id,body,created,system) VALUES(?,?,?,?,?,1)").bind(uid(),room,row.owner_id,"Auction ended. The highest bidder and owner must complete the in-game trade. The owner must confirm delivery before the auction closes.",created),env.DB.prepare("INSERT INTO notifications(id,recipient_id,body,room_id,created) VALUES(?,?,?,?,?)").bind(uid(),row.owner_id,"Your auction ended with a winning skin bid. Delivery confirmation is required.",room,created),env.DB.prepare("INSERT INTO notifications(id,recipient_id,body,room_id,created) VALUES(?,?,?,?,?)").bind(uid(),bid.bidder_id,"You won an auction. Open the private room to complete the in-game trade.",room,created)]);}}
export default {async fetch(req,env){
 if(req.method==="OPTIONS")return json({ok:true});
 const url=new URL(req.url),path=url.pathname.replace(/^\/api/,"");
 const status=oauthStatus(env);
 if(path==="/health")return json({ok:true,...status});
 if(path==="/auth/config"&&req.method==="GET")return json({googleEnabled:status.googleClientId&&status.googleClientSecret,discordEnabled:status.discordClientId&&status.discordClientSecret,ownerBootstrapConfigured:status.ownerEmails,siteUrl:safeSite(env,url),databaseBound:status.databaseBound});
 if(path==="/auth/diagnostics"&&req.method==="GET")return json({ok:true,visibleBindingNames:Object.keys(env||{}).sort(),status,note:"Only names and presence flags are returned; secret values are never exposed."});
 if(!status.databaseBound){
  const message="Cloudflare D1 database binding is missing. Add a D1 binding named DB to this Pages project, then redeploy.";
  if(path.startsWith("/auth/google/callback")||path.startsWith("/auth/discord/callback"))return oauthFail(env,url,message);
  return json({error:"Database not configured",detail:message,requiredBinding:"DB"},503);
 }
 try{
  await ensureCoreSchema(env);
  if(path==="/presence"&&req.method==="POST"){
   await ensurePresenceTable(env);
   const body=await req.json().catch(()=>({}));const me=await auth(req,env);const visitor=clean(body.visitorId,80)||uid();const kind=me?(me.role==="developer"||me.role==="admin"||me.role==="staff"?"staff":"user"):"guest";
   await env.DB.prepare("INSERT INTO presence(visitor_id,user_id,kind,last_seen) VALUES(?,?,?,?) ON CONFLICT(visitor_id) DO UPDATE SET user_id=excluded.user_id,kind=excluded.kind,last_seen=excluded.last_seen").bind(visitor,me?.id||null,kind,Date.now()).run();
   await env.DB.prepare("DELETE FROM presence WHERE last_seen<?").bind(Date.now()-10*60*1000).run();
   const cutoff=Date.now()-90000;const rows=(await env.DB.prepare("SELECT kind,COUNT(*) n FROM presence WHERE last_seen>=? GROUP BY kind").bind(cutoff).all()).results;const counts={guest:0,user:0,staff:0,total:0};for(const r of rows){counts[r.kind]=Number(r.n)||0;counts.total+=Number(r.n)||0}return json({counts,kind,visitorId:visitor});
  }
  if(path==="/presence"&&req.method==="GET"){
   await ensurePresenceTable(env);
   const cutoff=Date.now()-90000;const rows=(await env.DB.prepare("SELECT kind,COUNT(*) n FROM presence WHERE last_seen>=? GROUP BY kind").bind(cutoff).all()).results;const counts={guest:0,user:0,staff:0,total:0};for(const r of rows){counts[r.kind]=Number(r.n)||0;counts.total+=Number(r.n)||0}return json({counts});
  }
  if(path==="/auth/logout"&&(req.method==="POST"||req.method==="GET")){
   const current=await auth(req,env).catch(()=>null);
   if(current&&env.DB){await env.DB.prepare("DELETE FROM presence WHERE user_id=?").bind(current.id).run().catch(()=>{});}
   return json({ok:true,authenticated:false},200,{"set-cookie":clearSessionCookie(),"cache-control":"no-store"});
  }

  if(path==="/auth/google/start"&&req.method==="GET"){
   const googleClientId=envText(env,"GOOGLE_CLIENT_ID"),googleClientSecret=envText(env,"GOOGLE_CLIENT_SECRET");
   if(!googleClientId||!googleClientSecret)return oauthFail(env,url,"This production deployment cannot see GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET. Open /api/auth/diagnostics, confirm both flags are true, then redeploy Production.");
   const site=safeSite(env,url),state=uid(),nonce=uid(),redirectUri=`${site}/api/auth/google/callback`;
   const redirect=new URL("https://accounts.google.com/o/oauth2/v2/auth");
   redirect.searchParams.set("client_id",googleClientId);redirect.searchParams.set("redirect_uri",redirectUri);redirect.searchParams.set("response_type","code");redirect.searchParams.set("scope","openid email profile");redirect.searchParams.set("state",state);redirect.searchParams.set("nonce",nonce);redirect.searchParams.set("prompt","select_account");redirect.searchParams.set("access_type","online");
   return redirectWithCookies(redirect.toString(),[oauthCookie("otl_google_state",state),oauthCookie("otl_google_nonce",nonce)]);
  }
  if(path==="/auth/google/callback"&&req.method==="GET"){
   try{
    const site=safeSite(env,url),code=url.searchParams.get("code"),state=url.searchParams.get("state"),savedState=decodeURIComponent(cookieValue(req,"otl_google_state")||""),nonce=decodeURIComponent(cookieValue(req,"otl_google_nonce")||"");
    if(url.searchParams.get("error"))return oauthFail(env,url,"Google sign-in was cancelled.");
    if(!code||!state||!savedState||state!==savedState||!nonce)return oauthFail(env,url,"Google sign-in state expired. Please try again.");
    const googleClientId=envText(env,"GOOGLE_CLIENT_ID"),googleClientSecret=envText(env,"GOOGLE_CLIENT_SECRET");
    if(!googleClientId||!googleClientSecret)return oauthFail(env,url,"This production deployment cannot see the Google OAuth variables. Check /api/auth/diagnostics and redeploy Production.");
    const redirectUri=`${site}/api/auth/google/callback`;
    const form=new URLSearchParams({client_id:googleClientId,client_secret:googleClientSecret,code,grant_type:"authorization_code",redirect_uri:redirectUri});
    const tr=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
    const td=await tr.json().catch(()=>({}));
    if(!tr.ok||!td.id_token)return oauthFail(env,url,`Google rejected the login configuration${td.error_description?": "+clean(td.error_description,160):"."}`);
    const vr=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(td.id_token));const g=await vr.json().catch(()=>({}));
    if(!vr.ok||g.aud!==googleClientId||g.email_verified!=="true"||!g.sub||!g.email)return oauthFail(env,url,"Google could not verify this account and email.");
    if(g.nonce&&g.nonce!==nonce)return oauthFail(env,url,"Google sign-in nonce did not match. Please try again.");
    const email=normalizeEmail(g.email);let u=await env.DB.prepare("SELECT * FROM users WHERE (provider='google' AND provider_id=?) OR email=? LIMIT 1").bind(g.sub,email).first();
    if(!u){let username=normalizeUsername(email.split("@")[0]);if(username.length<3)username="user_"+g.sub.slice(-6);while(await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(username).first())username=(username.slice(0,15)+Math.floor(Math.random()*9999)).slice(0,20);const id=uid();await env.DB.prepare("INSERT INTO users(id,email,username,display_name,avatar,provider,provider_id,created) VALUES(?,?,?,?,?,?,?,?)").bind(id,email,username,clean(g.name||username,24),clean(g.picture||"/assets/default-avatar.svg",500),"google",g.sub,Date.now()).run();u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();}
    else if(u.provider!=="google"||u.provider_id!==g.sub){await env.DB.prepare("UPDATE users SET provider='google',provider_id=?,avatar=CASE WHEN avatar='' THEN ? ELSE avatar END WHERE id=?").bind(g.sub,clean(g.picture||"/assets/default-avatar.svg",500),u.id).run();u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first();}
    u=await applyVerifiedOwnerRole(env,u,email,true);const t=await tokenFor(env,u);
    return redirectWithCookies(`${site}/#online`,[sessionCookie(t),clearOauthCookie("otl_google_state"),clearOauthCookie("otl_google_nonce")]);
   }catch(e){return oauthFail(env,url,"Google server error: "+clean(e?.message||e,180));}
  }
  if(path==="/auth/discord/start"&&req.method==="GET"){
   const discordClientId=envText(env,"DISCORD_CLIENT_ID"),discordClientSecret=envText(env,"DISCORD_CLIENT_SECRET");
   if(!discordClientId||!discordClientSecret)return oauthFail(env,url,"This production deployment cannot see DISCORD_CLIENT_ID and/or DISCORD_CLIENT_SECRET. Open /api/auth/diagnostics, confirm both flags are true, then redeploy Production.");
   const site=safeSite(env,url),state=uid(),redirectUri=`${site}/api/auth/discord/callback`;const redirect=new URL("https://discord.com/oauth2/authorize");redirect.searchParams.set("client_id",discordClientId);redirect.searchParams.set("response_type","code");redirect.searchParams.set("redirect_uri",redirectUri);redirect.searchParams.set("scope","identify email");redirect.searchParams.set("state",state);redirect.searchParams.set("prompt","consent");
   return redirectWithCookies(redirect.toString(),[oauthCookie("otl_discord_state",state)]);
  }
  if(path==="/auth/discord/callback"&&req.method==="GET"){
   try{
    const code=url.searchParams.get("code"),state=url.searchParams.get("state"),cookie=decodeURIComponent(cookieValue(req,"otl_discord_state")||"");if(url.searchParams.get("error"))return oauthFail(env,url,"Discord sign-in was cancelled.");if(!code||!state||!cookie||state!==cookie)return oauthFail(env,url,"Discord sign-in state expired. Try again.");
    const discordClientId=envText(env,"DISCORD_CLIENT_ID"),discordClientSecret=envText(env,"DISCORD_CLIENT_SECRET");if(!discordClientId||!discordClientSecret)return oauthFail(env,url,"This production deployment cannot see the Discord OAuth variables. Check /api/auth/diagnostics and redeploy Production.");const site=safeSite(env,url),redirectUri=`${site}/api/auth/discord/callback`;const form=new URLSearchParams({client_id:discordClientId,client_secret:discordClientSecret,grant_type:"authorization_code",code,redirect_uri:redirectUri});
    const tr=await fetch("https://discord.com/api/oauth2/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});const td=await tr.json().catch(()=>({}));if(!tr.ok||!td.access_token)return oauthFail(env,url,"Discord rejected the login configuration.");
    const ur=await fetch("https://discord.com/api/users/@me",{headers:{authorization:`Bearer ${td.access_token}`}});const g=await ur.json().catch(()=>({}));if(!ur.ok||!g.id||!g.email||g.verified!==true)return oauthFail(env,url,"Discord did not provide a verified email.");
    const email=normalizeEmail(g.email),avatar=g.avatar?`https://cdn.discordapp.com/avatars/${g.id}/${g.avatar}.png?size=128`:"/assets/default-avatar.svg";
    let u=await env.DB.prepare("SELECT * FROM users WHERE (provider='discord' AND provider_id=?) OR email=? LIMIT 1").bind(g.id,email).first();
    if(!u){let username=normalizeUsername(g.username||"discord_user");if(username.length<3)username="user_"+g.id.slice(-6);while(await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(username).first())username=(username.slice(0,15)+Math.floor(Math.random()*9999)).slice(0,20);const id=uid();await env.DB.prepare("INSERT INTO users(id,email,username,display_name,avatar,provider,provider_id,created) VALUES(?,?,?,?,?,?,?,?)").bind(id,email,username,clean(g.global_name||g.username||username,24),avatar,"discord",g.id,Date.now()).run();u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first()}
    else if(u.provider!=="discord"||u.provider_id!==g.id){await env.DB.prepare("UPDATE users SET provider='discord',provider_id=?,avatar=CASE WHEN avatar='' THEN ? ELSE avatar END WHERE id=?").bind(g.id,avatar,u.id).run();u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(u.id).first()}
    u=await applyVerifiedOwnerRole(env,u,email,g.verified===true);
    const t=await tokenFor(env,u);return redirectWithCookies(`${site}/#online`,[sessionCookie(t),clearOauthCookie("otl_discord_state")]);
   }catch(e){return oauthFail(env,url,"Discord server error: "+clean(e?.message||e,180))}
  }
  if(path==="/auth/register"&&req.method==="POST"){
   const b=await req.json(),email=normalizeEmail(b.email),username=normalizeUsername(b.username),display=clean(b.displayName,24),password=String(b.password||"");
   if(!/^\S+@\S+\.\S+$/.test(email)||username.length<3||display.length<2||password.length<10)return json({error:"Invalid registration details"},400);
   const exists=await env.DB.prepare("SELECT id FROM users WHERE email=? OR username=?").bind(email,username).first();if(exists)return json({error:"Email or username already registered"},409);
   const id=uid(),salt=uid(),hash=await hashPassword(password,salt),created=Date.now();await env.DB.prepare("INSERT INTO users(id,email,username,display_name,password_hash,password_salt,provider,created) VALUES(?,?,?,?,?,?,?,?)").bind(id,email,username,display,hash,salt,"email",created).run();const u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first();const t=await tokenFor(env,u);return json({token:t,user:publicUser(u)},200,{"set-cookie":sessionCookie(t)});
  }
  if(path==="/auth/login"&&req.method==="POST"){
   const b=await req.json(),email=normalizeEmail(b.email),password=String(b.password||""),u=await env.DB.prepare("SELECT * FROM users WHERE email=? AND provider='email'").bind(email).first();if(!u||u.status!=="active")return json({error:"Incorrect email or password"},401);const hash=await hashPassword(password,u.password_salt);if(hash!==u.password_hash)return json({error:"Incorrect email or password"},401);const t=await tokenFor(env,u);return json({token:t,user:publicUser(u)},200,{"set-cookie":sessionCookie(t)});
  }
  if(path==="/auth/google/token"&&req.method==="POST"){
   const b=await req.json();if(!b.credential||!env.GOOGLE_CLIENT_ID)return json({error:"Google login is not configured"},400);const vr=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(b.credential));const g=await vr.json();if(!vr.ok||g.aud!==env.GOOGLE_CLIENT_ID||g.email_verified!=="true")return json({error:"Google sign-in verification failed"},401);let u=await env.DB.prepare("SELECT * FROM users WHERE provider_id=? AND provider='google'").bind(g.sub).first();if(!u){let username=normalizeUsername((g.email||"user").split("@")[0]);if(username.length<3)username="user_"+g.sub.slice(-6);while(await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(username).first())username=username.slice(0,15)+Math.floor(Math.random()*9999);const id=uid();await env.DB.prepare("INSERT INTO users(id,email,username,display_name,avatar,provider,provider_id,created) VALUES(?,?,?,?,?,?,?,?)").bind(id,normalizeEmail(g.email),username,clean(g.name||username,24),clean(g.picture,500),"google",g.sub,Date.now()).run();u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(id).first()}u=await applyVerifiedOwnerRole(env,u,g.email,g.email_verified==="true");const t=await tokenFor(env,u);return json({token:t,user:publicUser(u)},200,{"set-cookie":sessionCookie(t)});
  }
  const me=await auth(req,env);
  if(path==="/listings"&&req.method==="GET"){
   const {results}=await env.DB.prepare("SELECT l.*,u.username owner_username,u.display_name owner_display FROM listings l JOIN users u ON u.id=l.owner_id WHERE l.status IN ('open','delivery_pending','ended_no_bids') ORDER BY l.created DESC LIMIT 300").all();
   for(const x of results){x.give=JSON.parse(x.give_json);x.want=JSON.parse(x.want_json);x.buyout=JSON.parse(x.buyout_json||'[]');x.mine=Boolean(me&&x.owner_id===me.id);delete x.give_json;delete x.want_json;delete x.buyout_json;if(x.type==='auction'){const b=await env.DB.prepare("SELECT b.id,b.bidder_id,u.username bidder_username,u.display_name bidder_display,b.items_json,b.value,b.created FROM bids b JOIN users u ON u.id=b.bidder_id WHERE b.listing_id=? ORDER BY b.value DESC,b.created ASC LIMIT 100").bind(x.id).all();x.bids=b.results.map(v=>({...v,items:JSON.parse(v.items_json)}))}}
   return json({listings:results,authenticated:Boolean(me)});
  }
  if(!me)return json({error:"Authentication required"},401);
  if(path==="/auth/me")return json({user:publicUser(me)},200,{"cache-control":"no-store"});
  if(path==="/auth/email"&&req.method==="GET")return json({email:me.email},200,{"cache-control":"no-store"});
  if(path==="/auth/profile"&&req.method==="POST"){const b=await req.json(),display=clean(b.displayName,24),bio=clean(b.bio,180),avatar=String(b.avatar||'').trim().slice(0,300000);if(display.length<2||blocked(display+' '+bio))return json({error:"Invalid profile"},400);if(avatar&&!/^https:\/\//i.test(avatar)&&!avatar.startsWith('/assets/')&&!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(avatar))return json({error:"Profile image must be an HTTPS URL or an uploaded PNG, JPG, or WebP image"},400);if(avatar.length>300000)return json({error:"Profile image is too large"},413);await env.DB.prepare("UPDATE users SET display_name=?,bio=?,avatar=? WHERE id=?").bind(display,bio,avatar||'/assets/default-avatar.svg',me.id).run();const u=await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(me.id).first();return json({user:publicUser(u)});}
  if(path==="/inventory"&&req.method==="GET"){const rows=(await env.DB.prepare("SELECT item_id id,quantity FROM user_inventory WHERE user_id=? AND quantity>0 ORDER BY updated DESC").bind(me.id).all()).results;return json({inventory:rows});}
  if(path==="/inventory/sync"&&req.method==="POST"){const b=await req.json();const rows=await replaceInventory(env,me.id,b.inventory);return json({ok:true,inventory:rows.map(x=>({id:x.id,quantity:x.q}))});}
  await finalizeAuctions(env);
  if(path==="/listings"&&req.method==="POST"){
   const b=await req.json(),type=b.type==='auction'?'auction':'trade',title=clean(b.title,70),description=clean(b.description,500),give=Array.isArray(b.give)?b.give.slice(0,8).map(x=>clean(x,120)).filter(Boolean):[],want=Array.isArray(b.want)?b.want.slice(0,8).map(x=>clean(x,120)).filter(Boolean):[],buyout=Array.isArray(b.buyout)?b.buyout.slice(0,8).map(x=>clean(x,120)).filter(Boolean):[];
   if(!title||!give.length||blocked(title+' '+description))return json({error:"Invalid or blocked listing"},400);
   const owned=(await env.DB.prepare("SELECT item_id,quantity FROM user_inventory WHERE user_id=? AND quantity>0").bind(me.id).all()).results;const ownMap=new Map(owned.map(x=>[String(x.item_id),Number(x.quantity)]));const counts={};for(const id of give)counts[id]=(counts[id]||0)+1;for(const [id,q] of Object.entries(counts))if((ownMap.get(id)||0)<q)return json({error:"You can only list items currently in your inventory"},400);
   const minBid=type==='auction'?Math.floor(Number(b.minBidValue)||0):0,maxBid=type==='auction'?Math.floor(Number(b.maxBidValue)||0):0;if(type==='auction'&&(minBid<1||maxBid<1||minBid>maxBid))return json({error:"Auction starting value must be at least 1 and within the allowed item-value range"},400);
   const created=Date.now(),expires=Math.min(created+7*864e5,Math.max(created+36e5,Number(b.expires)||created+864e5)),id=uid();await env.DB.prepare("INSERT INTO listings(id,type,owner_id,title,description,give_json,want_json,category,preferred_section,preferred_set,min_bid_value,max_bid_value,buyout_json,created,expires,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,type,me.id,title,description,JSON.stringify(give),JSON.stringify(want),clean(b.category,20),clean(b.preferredSection,40),clean(b.preferredSet,40),minBid,maxBid,JSON.stringify(buyout),created,expires,"open").run();return json({ok:true,id});
  }
  let m=path.match(/^\/listings\/([^/]+)$/);if(m&&req.method==="DELETE"){await env.DB.prepare("UPDATE listings SET status='removed' WHERE id=? AND owner_id=?").bind(m[1],me.id).run();return json({ok:true});}
  m=path.match(/^\/listings\/([^/]+)\/accept$/);if(m&&req.method==="POST"){const row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND type='trade' AND status='open' AND expires>?").bind(m[1],Date.now()).first();if(!row)return json({error:"Trade unavailable"},404);if(row.owner_id===me.id)return json({error:"Cannot accept your own trade"},400);const room=uid(),created=Date.now();await env.DB.batch([env.DB.prepare("UPDATE listings SET status='accepted',accepted_by=? WHERE id=? AND status='open'").bind(me.id,row.id),env.DB.prepare("INSERT INTO rooms(id,listing_id,title,member_a,member_b,created,status) VALUES(?,?,?,?,?,?,?)").bind(room,row.id,row.title,row.owner_id,me.id,created,"open"),env.DB.prepare("INSERT INTO notifications(id,recipient_id,body,room_id,created) VALUES(?,?,?,?,?)").bind(uid(),row.owner_id,`${me.display_name} accepted your trade.`,room,created)]);return json({ok:true,room});}
  m=path.match(/^\/listings\/([^/]+)\/bid$/);if(m&&req.method==="POST"){const b=await req.json(),items=Array.isArray(b.items)?b.items.slice(0,8):[],value=Number(b.value)||0,row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND type='auction' AND status='open' AND expires>?").bind(m[1],Date.now()).first();if(!row)return json({error:"Auction unavailable"},404);if(row.owner_id===me.id)return json({error:"Cannot bid on your own auction"},400);if(!items.length||value<row.min_bid_value||(row.max_bid_value>0&&value>row.max_bid_value))return json({error:"Bid does not meet auction value requirements"},400);const ownedRows=(await env.DB.prepare("SELECT item_id,quantity FROM user_inventory WHERE user_id=? AND quantity>0").bind(me.id).all()).results;const ownedMap=new Map(ownedRows.map(x=>[String(x.item_id),Number(x.quantity)]));const bidCounts={};for(const raw of items){const id=clean(raw,120);if(id)bidCounts[id]=(bidCounts[id]||0)+1}for(const [id,q] of Object.entries(bidCounts))if((ownedMap.get(id)||0)<q)return json({error:"You can only bid items currently in your inventory"},400);await env.DB.prepare("INSERT INTO bids(id,listing_id,bidder_id,items_json,value,created) VALUES(?,?,?,?,?,?)").bind(uid(),row.id,me.id,JSON.stringify(items.map(x=>clean(x,120)).filter(Boolean)),Math.floor(value),Date.now()).run();return json({ok:true});}
  m=path.match(/^\/listings\/([^/]+)\/confirm-delivery$/);if(m&&req.method==="POST"){const row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND owner_id=? AND status='delivery_pending'").bind(m[1],me.id).first();if(!row)return json({error:"Pending auction not found"},404);const bid=await env.DB.prepare("SELECT * FROM bids WHERE id=?").bind(row.winning_bid_id).first();await decrementInventory(env,row.owner_id,JSON.parse(row.give_json||'[]'));if(bid)await decrementInventory(env,bid.bidder_id,JSON.parse(bid.items_json||'[]'));await env.DB.prepare("UPDATE listings SET status='completed',completed=? WHERE id=?").bind(Date.now(),row.id).run();await env.DB.prepare("UPDATE rooms SET status='closed' WHERE listing_id=?").bind(row.id).run();return json({ok:true,removeFromInventory:JSON.parse(row.give_json||'[]')});}
  m=path.match(/^\/listings\/([^/]+)\/complete$/);if(m&&req.method==="POST"){const row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND type='trade' AND status='accepted' AND (owner_id=? OR accepted_by=?)").bind(m[1],me.id,me.id).first();if(!row)return json({error:"Accepted trade not found"},404);await decrementInventory(env,row.owner_id,JSON.parse(row.give_json||'[]'));if(row.accepted_by)await decrementInventory(env,row.accepted_by,JSON.parse(row.want_json||'[]'));await env.DB.prepare("UPDATE listings SET status='completed',completed=? WHERE id=?").bind(Date.now(),row.id).run();await env.DB.prepare("UPDATE rooms SET status='closed' WHERE listing_id=?").bind(row.id).run();return json({ok:true,removeFromInventory:row.owner_id===me.id?JSON.parse(row.give_json||'[]'):JSON.parse(row.want_json||'[]')});}
  m=path.match(/^\/listings\/([^/]+)\/rerun$/);if(m&&req.method==="POST"){const row=await env.DB.prepare("SELECT * FROM listings WHERE id=? AND owner_id=? AND status='delivery_pending'").bind(m[1],me.id).first();if(!row)return json({error:"Pending auction not found"},404);const id=uid(),created=Date.now(),duration=Math.max(36e5,row.expires-row.created);await env.DB.batch([env.DB.prepare("UPDATE listings SET status='delivery_failed' WHERE id=?").bind(row.id),env.DB.prepare("INSERT INTO listings(id,type,owner_id,title,description,give_json,want_json,category,preferred_section,preferred_set,min_bid_value,max_bid_value,buyout_json,created,expires,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,'auction',me.id,row.title,row.description,row.give_json,row.want_json,row.category,row.preferred_section,row.preferred_set,row.min_bid_value,row.max_bid_value,row.buyout_json,created,created+duration,'open')]);return json({ok:true,id});}
  if(path==="/notifications"&&req.method==="GET"){const {results}=await env.DB.prepare("SELECT id,body,room_id roomId,created,read FROM notifications WHERE recipient_id=? ORDER BY created DESC LIMIT 100").bind(me.id).all();return json({notifications:results});}
  if(path==="/notifications/read"&&req.method==="POST"){await env.DB.prepare("UPDATE notifications SET read=1 WHERE recipient_id=?").bind(me.id).run();return json({ok:true});}
  m=path.match(/^\/rooms\/([^/]+)$/);if(m&&req.method==="GET"){const room=await env.DB.prepare("SELECT * FROM rooms WHERE id=? AND (member_a=? OR member_b=?)").bind(m[1],me.id,me.id).first();if(!room)return json({error:"Private room"},403);const members=await env.DB.prepare("SELECT id,username,display_name FROM users WHERE id IN (?,?)").bind(room.member_a,room.member_b).all();const msgs=await env.DB.prepare("SELECT m.author_id,u.display_name authorDisplay,m.body,m.created,m.system FROM messages m JOIN users u ON u.id=m.author_id WHERE room_id=? ORDER BY m.created ASC LIMIT 500").bind(room.id).all();return json({room:{id:room.id,title:room.title,status:room.status,membersDisplay:members.results.map(x=>x.display_name),messages:msgs.results}});}
  m=path.match(/^\/rooms\/([^/]+)\/messages$/);if(m&&req.method==="POST"){const room=await env.DB.prepare("SELECT * FROM rooms WHERE id=? AND status='open' AND (member_a=? OR member_b=?)").bind(m[1],me.id,me.id).first();if(!room)return json({error:"Private room unavailable"},403);const b=await req.json(),body=clean(b.body,300);if(!body||blocked(body))return json({error:"Message blocked by safety filter"},400);await env.DB.prepare("INSERT INTO messages(id,room_id,author_id,body,created,system) VALUES(?,?,?,?,?,0)").bind(uid(),room.id,me.id,body,Date.now()).run();return json({ok:true});}
  const isDeveloper=me.role==="developer"||me.role==="admin";
  if(path==="/admin/unlock"&&req.method==="POST"){if(!isDeveloper)return json({error:"Forbidden"},403);if(!envText(env,'ADMIN_ACCESS_CODE'))return json({error:"ADMIN_ACCESS_CODE is not configured in Cloudflare secrets"},503);const b=await req.json();if(String(b.code||'')!==envText(env,'ADMIN_ACCESS_CODE'))return json({error:"Incorrect developer access code"},401);const t=await adminTokenFor(env,me);return json({ok:true,adminToken:t});}
  if(path==="/admin/lock"&&req.method==="POST")return json({ok:true});
  const adminOK=isDeveloper&&await adminUnlocked(req,env,me);
  if(path==="/admin/overview"&&req.method==="GET"){
   if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);
   const users=(await env.DB.prepare("SELECT u.id,u.username,u.display_name,u.avatar,u.bio,u.provider,u.role,u.created,u.status,MAX(p.last_seen) last_seen,CASE WHEN MAX(p.last_seen)>=? THEN 1 ELSE 0 END online FROM users u LEFT JOIN presence p ON p.user_id=u.id GROUP BY u.id ORDER BY online DESC,u.created DESC LIMIT 500").bind(Date.now()-90000).all()).results;
   const listings=(await env.DB.prepare("SELECT l.id,l.title,l.type,l.status,l.created,u.username FROM listings l JOIN users u ON u.id=l.owner_id ORDER BY l.created DESC LIMIT 500").all()).results;
   const stats={users:(await env.DB.prepare("SELECT COUNT(*) n FROM users").first()).n,openListings:(await env.DB.prepare("SELECT COUNT(*) n FROM listings WHERE status IN ('open','delivery_pending','ended_no_bids')").first()).n,auctions:(await env.DB.prepare("SELECT COUNT(*) n FROM listings WHERE type='auction'").first()).n,rooms:(await env.DB.prepare("SELECT COUNT(*) n FROM rooms").first()).n};
   const rooms=(await env.DB.prepare("SELECT r.id,r.title,r.status,r.created,ua.display_name member_a_name,ub.display_name member_b_name,(SELECT COUNT(*) FROM messages m WHERE m.room_id=r.id) message_count FROM rooms r JOIN users ua ON ua.id=r.member_a JOIN users ub ON ub.id=r.member_b ORDER BY r.created DESC LIMIT 500").all()).results;return json({stats,users,listings,rooms});
  }

  if(path==="/admin/users/search"&&req.method==="GET"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);const q=clean(url.searchParams.get("q"),80);if(!q)return json({users:[]});const like=`%${q}%`;const users=(await env.DB.prepare("SELECT id,username,display_name,avatar,bio,provider,role,status,created FROM users WHERE username LIKE ? OR display_name LIKE ? ORDER BY created DESC LIMIT 50").bind(like,like).all()).results;return json({users});}
  m=path.match(/^\/admin\/users\/([^/]+)\/email$/);if(m&&req.method==="GET"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);const target=await env.DB.prepare("SELECT email FROM users WHERE id=?").bind(m[1]).first();if(!target)return json({error:"Account not found"},404);return json({email:target.email});}
  m=path.match(/^\/admin\/messages\/([^/]+)$/);if(m&&req.method==="DELETE"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);await env.DB.prepare("DELETE FROM messages WHERE id=? AND system=0").bind(m[1]).run();return json({ok:true});}
  m=path.match(/^\/admin\/users\/([^/]+)\/status$/);if(m&&req.method==="POST"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);const target=await env.DB.prepare("SELECT role FROM users WHERE id=?").bind(m[1]).first();if(!target||target.role==='developer'||target.role==='admin')return json({error:"Protected account"},403);const b=await req.json(),status=b.status==='active'?'active':'suspended';await env.DB.prepare("UPDATE users SET status=? WHERE id=?").bind(status,m[1]).run();return json({ok:true});}
  m=path.match(/^\/admin\/users\/([^/]+)\/role$/);if(m&&req.method==="POST"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);const target=await env.DB.prepare("SELECT id,email,role FROM users WHERE id=?").bind(m[1]).first();if(!target)return json({error:"Account not found"},404);const b=await req.json(),role=String(b.role||'user');if(!roleNames.has(role))return json({error:"Invalid role"},400);if(target.id===me.id&&role!=='developer')return json({error:"You cannot remove your own developer access"},400);if(target.role==='developer'&&target.id!==me.id&&role!=='developer')return json({error:"Other developer accounts are protected"},403);await env.DB.prepare("UPDATE users SET role=? WHERE id=?").bind(role,target.id).run();return json({ok:true});}
  m=path.match(/^\/admin\/rooms\/([^/]+)$/);if(m&&req.method==="GET"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);const room=await env.DB.prepare("SELECT r.*,ua.display_name member_a_name,ub.display_name member_b_name FROM rooms r JOIN users ua ON ua.id=r.member_a JOIN users ub ON ub.id=r.member_b WHERE r.id=?").bind(m[1]).first();if(!room)return json({error:"Room not found"},404);const messages=(await env.DB.prepare("SELECT m.id,m.body,m.created,m.system,u.display_name author_display,u.username author_username FROM messages m JOIN users u ON u.id=m.author_id WHERE m.room_id=? ORDER BY m.created ASC LIMIT 1000").bind(m[1]).all()).results;return json({room,messages});}
  m=path.match(/^\/admin\/listings\/([^/]+)$/);if(m&&req.method==="DELETE"){if(!adminOK)return json({error:"Developer panel locked. Enter the separate access code."},403);const listingId=m[1],listing=await env.DB.prepare("SELECT id,title,type,status FROM listings WHERE id=?").bind(listingId).first();if(!listing)return json({error:"Listing or auction was already removed"},404);const rooms=(await env.DB.prepare("SELECT id FROM rooms WHERE listing_id=?").bind(listingId).all()).results;for(const room of rooms){await env.DB.prepare("DELETE FROM messages WHERE room_id=?").bind(room.id).run();await env.DB.prepare("DELETE FROM notifications WHERE room_id=?").bind(room.id).run();}await env.DB.prepare("DELETE FROM notifications WHERE body LIKE ?").bind('%'+listing.title+'%').run();await env.DB.prepare("DELETE FROM rooms WHERE listing_id=?").bind(listingId).run();await env.DB.prepare("DELETE FROM bids WHERE listing_id=?").bind(listingId).run();const result=await env.DB.prepare("DELETE FROM listings WHERE id=?").bind(listingId).run();return json({ok:true,deleted:listing,id:listingId,changes:Number(result?.meta?.changes||1)});}
  return json({error:"Not found"},404);
 }catch(e){return json({error:"Server error",detail:String(e?.message||e)},500)}
}};
