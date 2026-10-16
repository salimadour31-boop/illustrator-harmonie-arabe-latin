# HarmoniserArabeLatin.jsx — Illustrator

Script Adobe Illustrator (ExtendScript) qui **donne à l'arabe et au tifinagh la même taille visible que le latin** — et, en option, une graisse accordée — dans les textes bilingues ou trilingues (cartes de visite, en-têtes, enseignes, emballages, affiches FR / AR / tamazight).

À corps égal, l'arabe paraît beaucoup plus petit que le latin (ses lettres occupent moins de hauteur dans le cadratin) et le tifinagh parfois plus grand. Aujourd'hui on corrige à l'œil, passage par passage. Ce script mesure la vraie forme des lettres des polices utilisées et règle chaque passage arabe ou tifinagh automatiquement, sans toucher au reste de la mise en forme.

> **Statut : non testé dans Illustrator.** La syntaxe et la logique ont été vérifiées hors d'Illustrator (voir « Tests »). Travaillez sur une copie de votre fichier.

## Ce que fait le script

- **Mesure réelle des polices** : chaque police utilisée est vectorisée sur un calque temporaire (puis effacé) à 100 pt :
  - latin : hauteur d'x (`x`), capitales (`H`), hampes (`l`) ;
  - arabe : corps des lettres = médiane du haut des formes médianes sans point au-dessus (`ـبـ ـسـ ـصـ ـحـ`), hauteur de l'alif, avec le composeur Moyen-Orient ;
  - tifinagh : médiane de `ⵎ ⴷ ⵙ ⵏ` ;
  - glyphes absents détectés (boîtes .notdef identiques ou police remplacée par la protection des glyphes) : ces passages sont signalés, jamais modifiés.
- **Correspondance au choix** : corps arabe = hauteur d'x latine (par défaut), alif = capitales, ou alif = hampes ; tifinagh = capitales ou hauteur d'x ; coefficient en % (ex. 105 % pour un arabe un peu plus présent).
- **Référence trouvée automatiquement** : le latin du même paragraphe (style dominant), sinon du même bloc, sinon du **bloc latin le plus proche** (même rang de paragraphe quand les deux blocs en ont autant : titre ↔ titre, adresse ↔ adresse).
- **Lettre par lettre** : dans un paragraphe mixte (« Tél / الهاتف : 0555… »), seuls les caractères arabes / tifinagh changent ; espaces, ponctuation (، ؛ ؟ ! ( )) et chiffres suivent l'écriture voisine quand elle est la même des deux côtés (option : ne jamais toucher aux chiffres 0-9). Police, couleur, approche, etc. restent intacts.
- **Deux méthodes** : échelle horizontale + verticale (par défaut, conseillée : garde le corps et l'interlignage, garde un éventuel rapport H/V) ou corps en pt (arrondi 0,1 / 0,25 / 0,5 / 1 pt). Écarts sous la tolérance (2 % par défaut) laissés tels quels. Relancer le script ne cumule rien : les valeurs sont calculées à partir des mesures, pas de l'état précédent.
- **Sens inverse** : ajuster le latin sur l'arabe quand l'arabe est la langue principale.
- **Graisse** : épaisseur moyenne des traits mesurée (2 × surface / périmètre des contours) après mise à la bonne taille, comparée au latin ; si l'écart dépasse ±12 %, le script cherche dans la même famille (Light, Regular, SemiBold, Bold…) le style le plus proche, le **conseille** dans le rapport et peut l'**appliquer** (l'échelle est alors recalculée pour ce style).
- **Analyser** : rapport sans modification (polices, mesures en em, facteur, nouvelle échelle ou nouveau corps, graisse, passages sans référence ou non mesurables).
- **Planche de contrôle** : à droite du plan de travail actif, sur un calque non imprimable, chaque couple de polices côte à côte avec la ligne de base, la hauteur latine (magenta) et la hauteur arabe / tifinagh (cyan).
- **Contrôle après application** (nouvelle lecture du texte), rapport `.txt` en option, **Remettre à 100 %** (échelle H/V de l'écriture visée), **Effacer la planche**.
- Portée : sélection (objets, groupes, ou texte sélectionné à l'outil Texte → bloc parent) ou tout le document ; textes et calques verrouillés ou masqués ignorés. Dialogue français / anglais selon la langue d'Illustrator.

## Pourquoi c'est nouveau

Vérifié le 17 octobre 2026 :

- **Illustrator** n'a aucune fonction équivalente : l'option *Hauteur de police* (capitales / hauteur d'x) lit les métriques de la police, qui ne décrivent pas les lettres arabes ; les *polices composites* ne connaissent que les catégories japonaises/chinoises (seule trace : la demande « Arabic Composite fonts » sur l'UserVoice d'InDesign).
- **Adobe Community** (« Arabic letters and Baseline ») et **Graphic Design Stack Exchange** (« Adjust font size relative to another font size in InDesign », équivalent de `font-size-adjust`) : seule réponse, régler à l'œil une échelle H/V dans un style de caractère InDesign. Le script InDesign *get-x-height* de Roland Dreger mesure une hauteur d'x sans rien comparer ni régler.
- Rien sur **GitHub** (`gh search repos` / `gh search code` : « arabic latin size », « arabic x-height illustrator », « bilingual font size match », « arabic verticalScale », « xHeight arabic »), ni dans les listes de scripts de creold, Hiroyuki Sato, John Wundes, Alexander Ladygin, wckdtall, Kelso Cartography, Josh Duncan, sttk3, vexy ; ni chez Astute Graphics ou Adobe Exchange (ScribeDOOR de Winsoft gère la saisie arabe, pas l'harmonisation des tailles).
- Les solutions existantes sont hors d'Illustrator : propriété CSS `font-size-adjust` (Web), extensions de navigateur qui agrandissent l'arabe (Huruf).

## Installation

1. Téléchargez `HarmoniserArabeLatin.jsx`.
2. Soit **Fichier > Scripts > Autre script…** (Ctrl+F12 / Cmd+F12) et choisissez le fichier ;
3. soit copiez-le dans le dossier des scripts puis redémarrez Illustrator :
   - Windows : `C:\Program Files\Adobe\Adobe Illustrator <version>\Presets\fr_FR\Scripts\`
   - macOS : `/Applications/Adobe Illustrator <version>/Presets/fr_FR/Scripts/`

   Il apparaît alors dans **Fichier > Scripts**.

## Utilisation

1. Ouvrez une **copie** du document. Sélectionnez les textes à harmoniser (ou rien et choisissez « Tout le document »).
2. Lancez le script, choisissez la correspondance (corps arabe = hauteur d'x par défaut) et la méthode (échelle H/V conseillée).
3. Cliquez **Analyser** pour voir les réglages sans rien modifier, puis **Harmoniser**.
4. Vérifiez la planche de contrôle (calque « Harmonie arabe-latin (controle) », non imprimable) puis effacez-la avec **Effacer la planche**.
5. Pour revenir en arrière : Édition > Annuler (selon la version d'Illustrator, plusieurs Annuler peuvent être nécessaires) ou **Remettre à 100 %** (méthode échelle).

Remarques : l'harmonisation est géométrique (hauteur des lettres, épaisseur moyenne des traits) ; l'œil reste juge, d'où le coefficient et la planche. Avec la méthode « Corps », un interlignage automatique change avec le corps. La recherche des styles de la même famille parcourt une fois la liste des polices installées (quelques secondes avec beaucoup de polices). Caractères hors BMP (emoji…) : seuls les passages entiers sont traités dans ces paragraphes.

## Version ciblée

Illustrator CC 2018 (22) à 2026 (30), Windows et macOS. ExtendScript ES3, aucun appel réseau, aucune collecte de données.

## Tests

**Non testé dans Illustrator.** Tests réellement exécutés (Node.js) :

- `node tests/syntax.js` : syntaxe ES3 et ES5 OK (acorn) ;
- `node tests/test-core.js` : 104 tests du moteur (écritures Unicode et neutres, facteurs, arrondis, bornes, graisse, référence voisine par rang, sens inverse, tifinagh, rapport) dont 2 000 cas aléatoires : hauteurs égales après application à la tolérance + arrondi près, et second passage sans aucune action ;
- `node tests/test-mock.js` : 56 tests sur un DOM Illustrator simulé (mesure par vectorisation, détection des glyphes absents, cache, calque temporaire retiré, document complet avec blocs verrouillés / masqués, planche de contrôle non imprimable ignorée au passage suivant, analyse sans modification, remise à 100 %, sélection / groupe / texte sélectionné, corps, graisse appliquée, dialogue ScriptUI simulé, messages sans document).

## Licence

MIT — Copyright (c) 2026 Amirouche Amwanes. Code original.
