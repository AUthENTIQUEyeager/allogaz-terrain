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

## Prochaine étape : brancher Supabase

Les deux apps tournent pour l'instant avec des données d'exemple en
mémoire. Pour les connecter à ta vraie base :

```bash
npm install @supabase/supabase-js
```

Puis crée un fichier `.env.local` (non versionné) dans chaque dossier :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
```

Et dans Vercel, ajoute ces deux mêmes variables (Settings → Environment
Variables) pour chacun des deux projets, sinon le build de production ne
les aura pas.
