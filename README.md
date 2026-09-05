# AlloGaz Terrain

Deux applications séparées, dans un même dépôt (monorepo) mais déployées
comme deux projets Vercel indépendants :

- `demarcheur/` — app mobile pour les agents (fiche + capture GPS)
- `admin/` — dashboard de supervision (carte temps réel)

Elles partagent le même projet Supabase mais restent deux fronts distincts,
avec deux URLs différentes, ce qui permet de donner l'accès admin
uniquement à qui doit l'avoir.

## Pourquoi pas dans le même dossier ?

Chaque app a son propre `package.json`, son propre point d'entrée et son
propre build. Vercel déploie un projet = un dossier avec sa propre
configuration ; les mélanger casserait le build des deux.

## Déploiement sur Vercel

1. Pousse ce dossier `allogaz-terrain/` sur GitHub (un seul dépôt, les deux
   sous-dossiers dedans).
2. Sur vercel.com → **Add New → Project** → importe le dépôt GitHub.
3. Vercel te demande le **Root Directory** : mets `demarcheur`. Framework
   détecté automatiquement (Vite). Déploie.
4. Reviens sur **Add New → Project**, importe le **même** dépôt une
   deuxième fois, mets cette fois **Root Directory** = `admin`. Déploie.

Tu obtiens deux URLs Vercel distinctes (ex :
`allogaz-terrain-demarcheur.vercel.app` et
`allogaz-terrain-admin.vercel.app`), que tu peux ensuite pointer vers tes
propres sous-domaines (`terrain.allogaz.com`, `admin.allogaz.com`) dans
Vercel → Settings → Domains.

## Carte : Leaflet + CARTO (gratuit, sans clé API)

Le dashboard admin utilise une vraie carte interactive (rues, zoom,
déplacement) via **Leaflet** avec des fonds de carte **CARTO Voyager**
(basés sur OpenStreetMap) — entièrement gratuit, aucune clé API à
configurer, contrairement à Google Maps.

- Chaque marqueur garde son code couleur par agent et sa forme par
  statut (rond plein = inscrit, rond creux = prospect, losange = refus),
  avec le nom du commerce affiché à côté du point, et le détail complet
  au survol/clic.
- La carte se recadre automatiquement sur les fiches visibles à chaque
  changement de filtre.
- Les fonds CARTO sont adaptés à un usage produit normal mais restent un
  service tiers gratuit avec des limites d'usage raisonnable (pas pensé
  pour un trafic massif). Si le volume grossit beaucoup, les alternatives
  courantes sont MapTiler, Stadia Maps ou Mapbox (clé API requise, avec
  un palier gratuit généreux).

## Créer et gérer les démarcheurs depuis l'admin

Le dashboard admin a maintenant un onglet **Démarcheurs** (à côté de
"Carte") pour créer des comptes agents et voir la liste, sans repasser
par le dashboard Supabase à chaque fois.

Trois choses à mettre en place pour que ça marche :

**1. Lancer la migration `0004_agents_management.sql`** (fournie à côté,
pas dans ce zip) dans le SQL Editor Supabase. Elle ajoute l'email sur
`profiles` (pour l'afficher dans la liste) et une policy permettant à un
admin de modifier n'importe quel profil.

**2. Déployer la Edge Function `create-agent`.** C'est elle qui crée
réellement le compte — la clé secrète Supabase ("service_role", qui
donne un accès total à la base) ne doit **jamais** être mise dans le
code React, donc la création de compte passe par une petite fonction
côté serveur. Le code est dans `supabase/functions/create-agent/index.ts`
de ce zip. Le plus simple, sans rien installer :

- Dashboard Supabase → **Edge Functions** → **Deploy a new function**
- Nomme-la exactement `create-agent`
- Colle le contenu du fichier `index.ts`
- Déploie

Les clés dont la fonction a besoin (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) sont déjà disponibles automatiquement pour
toute Edge Function — rien à configurer en plus.

(Alternative avec la CLI si tu préfères : `supabase functions deploy
create-agent`.)

**3. Utiliser l'onglet Démarcheurs.** Renseigne nom + email + mot de
passe (un bouton "Générer" en propose un), clique "Créer le compte" — le
compte est créé avec le rôle `demarcheur` directement, il apparaît tout
de suite dans la liste et sur la carte. Communique ensuite l'email et le
mot de passe affichés à l'agent pour qu'il se connecte sur l'app
démarcheur.

## Responsive

Le dashboard admin s'adapte maintenant aux petits écrans : en dessous
d'environ 900px de large, les filtres passent dans un tiroir accessible
via le bouton "Filtres", et la carte/liste se réorganisent en colonne.

## Supabase est déjà branché — il ne reste que la config

Les deux apps utilisent maintenant `@supabase/supabase-js` : vraie
authentification (email/mot de passe), insertion/lecture de
`field_visits`, et abonnement Realtime côté admin. Il ne reste que 3
choses à faire pour que ça tourne :

1. **Renseigner les identifiants Supabase.** Dans `demarcheur/` et dans
   `admin/`, copie `.env.example` en `.env.local` (non versionné) et
   remplace par ton URL et ta clé anon (Supabase → Project Settings →
   API).

2. **Ajouter les mêmes variables dans Vercel.** Pour chacun des deux
   projets Vercel : Settings → Environment Variables → ajoute
   `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`, puis redéploie
   (Vercel ne relit pas les variables sans un nouveau déploiement).

3. **Activer Realtime sur `field_visits`.** Dans Supabase → Database →
   Replication, active la réplication pour la table `field_visits` —
   sinon le dashboard admin se charge bien au démarrage mais ne reçoit
   pas les nouvelles fiches en direct.

## Créer les premiers comptes de test

Crée les comptes dans Supabase → Authentication → Users → Add user, puis
attribue leur rôle par email (pas besoin de chercher leur UUID à la
main) — même technique que celle déjà utilisée dans `0001_init.sql`
pour promouvoir un admin :

```sql
-- Agent démarcheur
update public.profiles
set role = 'demarcheur'
where id = (select id from auth.users where email = 'agent@allogaz.com');

-- Admin
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'admin@allogaz.com');
```

Le trigger `handle_new_user` crée déjà le profil automatiquement à la
création du compte ; ces requêtes ne font que corriger son rôle après
coup.
