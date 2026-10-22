import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function anonKey() {
  const direct = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (direct) return direct;
  const keys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!keys) return "";
  try {
    const parsed = JSON.parse(keys);
    if (typeof parsed === "string") return parsed;
    if (!parsed || typeof parsed !== "object") return "";
    const value = Object.values(parsed).find((v) => typeof v === "string");
    return typeof value === "string" ? value : "";
  } catch {
    return keys;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const key = anonKey();
  if (!token || !supabaseUrl || !key) return json({ error: "Sessão Supabase necessária." }, 401);

  const supabase = createClient(supabaseUrl, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);

  const { data: member, error: memberError } = await supabase
    .from("crm_members")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (memberError || member?.role !== "admin") return json({ error: "Apenas Administradores podem consultar preços." }, 403);

  const apiKey = Deno.env.get("SERPAPI_API_KEY");
  if (!apiKey) return json({ error: "A chave SERPAPI_API_KEY ainda não foi configurada no Supabase." }, 503);

  let payload: { itens?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }
  const incoming = Array.isArray(payload.itens) ? payload.itens : [];
  if (incoming.length === 0) return json({ itens: [], limite: 20, limiteExcedido: false });
  if (incoming.length > 100) return json({ error: "A nota excede o limite de 100 itens para consulta." }, 400);
  const itens = incoming.slice(0, 20) as Array<{ indice?: unknown; nome?: unknown; gtin?: unknown }>;

  async function buscar(item: { indice?: unknown; nome?: unknown; gtin?: unknown }) {
    const nome = String(item.nome || "").trim().slice(0, 140);
    const gtin = String(item.gtin || "").replace(/\D/g, "").slice(0, 14);
    if (!nome) return { indice: Number(item.indice) || 0, resultados: [] };
    const q = gtin ? `${gtin} ${nome}` : nome;
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", q);
    url.searchParams.set("google_domain", "google.com.br");
    url.searchParams.set("gl", "br");
    url.searchParams.set("hl", "pt-br");
    url.searchParams.set("location", "Lauro de Freitas, Bahia, Brazil");
    url.searchParams.set("num", "8");
    url.searchParams.set("api_key", apiKey);
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error(`Busca de mercado retornou HTTP ${response.status}.`);
    const data = await response.json();
    const resultados = (Array.isArray(data.shopping_results) ? data.shopping_results : [])
      .map((r: Record<string, unknown>) => {
        const preco = Number(r.extracted_price);
        const link = String(r.product_link || r.link || "");
        return {
          titulo: String(r.title || "").slice(0, 180),
          loja: String(r.source || "").slice(0, 80),
          preco: Number.isFinite(preco) && preco > 0 ? preco : 0,
          link: link.startsWith("https://") ? link : "",
        };
      })
      .filter((r: { preco: number; titulo: string }) => r.preco > 0 && r.titulo)
      .slice(0, 8);
    return { indice: Number(item.indice) || 0, resultados };
  }

  const resultados: Array<{ indice: number; resultados: unknown[] }> = [];
  try {
    for (let i = 0; i < itens.length; i += 3) {
      const lote = await Promise.all(itens.slice(i, i + 3).map(buscar));
      resultados.push(...lote);
    }
  } catch (error) {
    console.error("Falha na consulta de preços online", error);
    return json({ error: "Não foi possível consultar os preços online agora." }, 502);
  }

  return json({ itens: resultados, limite: 20, limiteExcedido: incoming.length > 20 });
});
