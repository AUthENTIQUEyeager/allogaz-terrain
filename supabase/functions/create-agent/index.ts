// supabase/functions/create-agent/index.ts
//
// Crée un compte démarcheur (auth + profil) à la demande de l'admin.
//
// IMPORTANT : c'est le SEUL endroit où la clé service_role doit être
// utilisée. Elle ne doit jamais apparaître dans le code des apps React
// (demarcheur/ ou admin/) — quiconque ouvrirait les outils de
// développement du navigateur pourrait la lire et obtenir un accès total
// à la base, RLS compris. Ici, la clé reste côté serveur Supabase.
//
// Sécurité : la fonction vérifie elle-même que l'appelant est bien
// authentifié ET a le rôle 'admin' avant de créer quoi que ce soit,
// indépendamment de la vérification de JWT faite par la plateforme.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Non authentifié." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client "au nom de l'appelant" — sert uniquement à vérifier qui il est
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) return json({ error: "Session invalide." }, 401);

    const { data: profile } = await callerClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return json({ error: "Réservé aux administrateurs." }, 403);
    }

    const { email, password, full_name } = await req.json();
    if (!email || !password) {
      return json({ error: "Email et mot de passe requis." }, 400);
    }

    // Client "service" : seul endroit de toute l'appli où la clé
    // service_role est utilisée, toujours côté serveur.
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "demarcheur", full_name: full_name || null },
      });

    if (createError) return json({ error: createError.message }, 400);

    return json({ id: created.user.id, email: created.user.email });
  } catch (e) {
    return json({ error: e?.message || "Erreur inattendue." }, 500);
  }
});
