/* ==========================================================================
   Catalogue D&D BOIS DE CHAUFFAGE
   Données figées dans le code (pas de base de données, pas d'admin).
   Chaque produit existe en un seul article, stock disponible jusqu'à 100.
   ========================================================================== */

const CATEGORIES = [
  { key: 'bois-chauffage', label: 'Bois de chauffage', short: 'Bûches & essences', img: 'https://images.pexels.com/photos/128639/pexels-photo-128639.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=700' },
  { key: 'packs', label: 'Packs & offres', short: 'Réserves d\'hiver', img: 'https://images.pexels.com/photos/2203077/pexels-photo-2203077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=700' },
  { key: 'allumage', label: 'Allumage & combustion', short: 'Démarrage du feu', img: 'https://images.pexels.com/photos/19899577/pexels-photo-19899577/free-photo-of-fire-burning-in-basket-at-night.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=700' }
];

/* Autres catégories : jamais affichées sur l'accueil ni dans « Bois de chauffage ».
   Elles n'apparaissent que sur la page « Autres catégories » (/pages/produits?cat=autres)
   et dans leur propre catégorie. Cinq produits par catégorie. */
const OTHER_CATEGORIES = [
  { key: 'cartes-collection', label: 'Cartes à collectionner', short: 'Cartes sport & fans' },
  { key: 'cartes-graphiques', label: 'Cartes graphiques', short: 'GPU gaming & création' },
  { key: 'gaming', label: 'Gaming', short: 'Univers gaming' },
  { key: 'lunettes-soleil', label: 'Lunettes de soleil', short: 'Solaires' },
  { key: 'aliment-chien', label: 'Aliments pour chien', short: 'Alimentation naturelle' },
  { key: 'tracteurs-agricoles', label: 'Tracteurs agricoles', short: 'Matériel neuf' },
  { key: 'tracteurs-occasion', label: 'Tracteurs d\'occasion', short: 'Matériel d\'occasion' },
  { key: 'moissonneuses-batteuses', label: 'Moissonneuses-batteuses', short: 'Récolte' },
  { key: 'semoirs', label: 'Semoirs', short: 'Semis direct' },
  { key: 'remorques', label: 'Remorques', short: 'Remorques bennes' },
  { key: 'tondeuses', label: 'Tondeuses', short: 'Entretien des espaces verts' },
  { key: 'pneus-agricoles', label: 'Pneus agricoles', short: 'Pneumatiques' },
  { key: 'irrigation', label: 'Irrigation', short: 'Irrigation & arrosage' }
];

function isOtherCategory(key){
  return OTHER_CATEGORIES.some(c => c.key === key);
}
function isOtherProduct(p){
  return isOtherCategory(p.category);
}

function px(id, file){
  // Les fichiers Pexels au format long (ex. free-photo-of-...) vivent dans un
  // sous-dossier /pexels-photo-{id}/ ; les fichiers courts (pexels-photo-{id}.jpeg)
  // sont directement à la racine. Sans ce sous-dossier, l'image renvoie une 404.
  const folder = file.startsWith('pexels-photo-') ? '' : `pexels-photo-${id}/`;
  return `https://images.pexels.com/photos/${id}/${folder}${file}?auto=compress&cs=tinysrgb&dpr=1&w=700`;
}

const PRODUCTS = [
  // ---------------- BOIS DE CHAUFFAGE ----------------
  { id:1, category:'bois-chauffage', name:'Bûches de bois de chauffage – 25 cm', unit:'filet de 40 L', price:39.90, stock:100,
    desc:'Bûches courtes de 25 cm, calibrées pour poêles et inserts compacts. Séchage naturel, taux d\'humidité maîtrisé.',
    media:{type:'photo', src:px(8827814,'pexels-photo-8827814.jpeg'), alt:'Bûches de bois de chauffage empilées'} },
  { id:2, category:'bois-chauffage', name:'Bûches de bois de chauffage – 33 cm', unit:'filet de 40 L', price:42.90, stock:100, badge:'Best-seller',
    desc:'Le format le plus polyvalent, adapté à la majorité des foyers fermés et poêles à bois du marché français.',
    media:{type:'photo', src:px(15962304,'free-photo-of-close-up-of-a-pile-of-chopped-wood.jpeg'), alt:'Bûches de 33 cm en gros plan'} },
  { id:3, category:'bois-chauffage', name:'Bûches de bois de chauffage – 40 cm', unit:'filet de 40 L', price:44.90, stock:100,
    desc:'Format long pour foyers ouverts et grandes chaudières bois. Combustion longue, moins de rechargements.',
    media:{type:'photo', src:px(8248514,'pexels-photo-8248514.jpeg'), alt:'Bûches de 40 cm prêtes à l\'emploi'} },
  { id:4, category:'bois-chauffage', name:'Bûches de bois de chauffage – 50 cm', unit:'filet de 40 L', price:46.90, stock:100,
    desc:'Longueur adaptée aux grandes cheminées et foyers extérieurs. Belle tenue au feu sur soirée entière.',
    media:{type:'photo', src:px(13540381,'pexels-photo-13540381.jpeg'), alt:'Bûches longues empilées au soleil'} },
  { id:5, category:'bois-chauffage', name:'Bois de chauffage Premium – Chêne', unit:'filet de 40 L', price:54.90, stock:100, badge:'Premium',
    desc:'Chêne fendu, pouvoir calorifique élevé et combustion lente. La référence pour une chaleur longue durée.',
    media:{type:'photo', src:px(9316925,'pexels-photo-9316925.jpeg'), alt:'Bûches de chêne fendu'} },
  { id:6, category:'bois-chauffage', name:'Bois de chauffage Premium – Hêtre', unit:'filet de 40 L', price:52.90, stock:100, badge:'Premium',
    desc:'Hêtre sec, flamme régulière et braises durables. Un classique apprécié pour son excellent rendement.',
    media:{type:'photo', src:px(9711778,'pexels-photo-9711778.jpeg'), alt:'Bûches de hêtre empilées'} },
  { id:7, category:'bois-chauffage', name:'Bois de chauffage Premium – Charme', unit:'filet de 40 L', price:53.90, stock:100, badge:'Premium',
    desc:'Charme fendu, bois dense à combustion lente. Excellent choix pour tenir le feu toute la nuit.',
    media:{type:'photo', src:px(629138,'pexels-photo-629138.jpeg'), alt:'Bûches de charme séchées'} },
  { id:8, category:'bois-chauffage', name:'Bois de chauffage Premium – Mélange de feuillus', unit:'filet de 40 L', price:49.90, stock:100,
    desc:'Assortiment de feuillus durs sélectionnés (chêne, hêtre, charme) pour un bon équilibre prix / chaleur.',
    media:{type:'photo', src:px(6066139,'pexels-photo-6066139.jpeg'), alt:'Assortiment de bûches de feuillus'} },
  { id:9, category:'bois-chauffage', name:'Bois de chauffage séché – taux d\'humidité réduit', unit:'filet de 40 L', price:57.90, stock:100, badge:'< 20 % humidité',
    desc:'Séchage poussé sous abri, humidité contrôlée sous 20 %. Allumage plus rapide, rendement optimal, moins de fumée.',
    media:{type:'photo', src:px(12826984,'pexels-photo-12826984.jpeg'), alt:'Bois de chauffage sec en gros plan'} },
  { id:10, category:'bois-chauffage', name:'Bûches densifiées / bûches compressées', unit:'colis de 10 kg', price:12.90, stock:100,
    desc:'Bûches de sciure compressée sans additif. Combustion propre, très peu de cendres, stockage compact.',
    media:{type:'photo', src:px(36091248,'free-photo-of-stacked-firewood-close-up-showing-rustic-texture.jpeg'), alt:'Bûches compressées empilées'} },
  { id:11, category:'bois-chauffage', name:'Bois d\'allumage – petit format', unit:'filet de 20 L', price:14.90, stock:100,
    desc:'Petit bois calibré pour démarrer le feu rapidement, en complément de vos bûches habituelles.',
    media:{type:'photo', src:px(1136464,'pexels-photo-1136464.jpeg'), alt:'Petit bois d\'allumage'} },
  { id:12, category:'bois-chauffage', name:'Bois d\'allumage – grand sac', unit:'sac de 100 L', price:24.90, stock:100,
    desc:'Grand volume de petit bois sec, pour une saison complète d\'allumages sans recharge fréquente.',
    media:{type:'photo', src:px(4153348,'pexels-photo-4153348.jpeg'), alt:'Sac de bois d\'allumage'} },

  // ---------------- PACKS / OFFRES ----------------
  { id:13, category:'packs', name:'Pack Découverte – bois de chauffage', unit:'3 filets de 40 L', price:99.90, stock:100,
    desc:'Trois filets pour tester notre bois avant de constituer votre réserve d\'hiver. Idéal en première commande.',
    media:{type:'photo', src:px(36788671,'free-photo-of-freshly-cut-firewood-logs-outdoors.jpeg'), alt:'Pack découverte de bois de chauffage'} },
  { id:14, category:'packs', name:'Pack Hiver – bois + allume-feu', unit:'pack complet', price:129.90, stock:100, badge:'Populaire',
    desc:'Bûches premium et allume-feu naturel réunis dans un seul pack. Tout ce qu\'il faut pour démarrer la saison.',
    media:{type:'photo', src:px(26612924,'free-photo-of-tree-logs-in-sawmill.jpeg'), alt:'Pack hiver bois et allume-feu'} },
  { id:15, category:'packs', name:'Pack Famille – réserve de bois', unit:'12 filets de 40 L', price:219.90, stock:100,
    desc:'Réserve pensée pour un foyer utilisant le bois comme chauffage d\'appoint régulier tout l\'hiver.',
    media:{type:'photo', src:px(2203077,'pexels-photo-2203077.jpeg'), alt:'Réserve de bois pour la famille'} },
  { id:16, category:'packs', name:'Pack Grand Froid – réserve hiver', unit:'20 filets de 40 L', price:349.90, stock:100, badge:'Stock complet',
    desc:'La réserve la plus complète pour un chauffage bois principal, pensée pour couvrir toute la saison froide.',
    media:{type:'photo', src:px(247701,'pexels-photo-247701.jpeg'), alt:'Grande réserve de bois pour l\'hiver'} },
  { id:17, category:'packs', name:'Pack Premium – bois haute qualité', unit:'10 filets de 40 L', price:259.90, stock:100, badge:'Premium',
    desc:'Sélection de nos essences premium (chêne, hêtre, charme) assemblée pour un rendement calorifique maximal.',
    media:{type:'photo', src:px(235309,'pexels-photo-235309.jpeg'), alt:'Pack premium de bois de chauffage'} },
  { id:18, category:'packs', name:'Pack Allumage – petit bois + allume-feu', unit:'pack complet', price:34.90, stock:100,
    desc:'Petit bois calibré et allume-feu naturel réunis pour ne plus jamais galérer à démarrer votre feu.',
    media:{type:'photo', src:px(8951848,'pexels-photo-8951848.jpeg'), alt:'Pack allumage petit bois'} },

  // ---------------- ALLUMAGE ET COMBUSTION ----------------
  { id:19, category:'allumage', name:'Allume-feu naturel', unit:'boîte de 100', price:9.90, stock:100,
    desc:'Allume-feu 100 % naturel à base de fibres de bois et cire végétale. Sans odeur, sans projection.',
    media:{type:'photo', src:px(19899577,'free-photo-of-fire-burning-in-basket-at-night.jpeg'), alt:'Feu démarré avec allume-feu naturel'} },
  { id:20, category:'allumage', name:'Allume-feu en laine de bois', unit:'boîte de 48', price:8.90, stock:100,
    desc:'Laine de bois imprégnée de cire, allumage instantané même par temps humide. Combustion 8 à 10 minutes.',
    media:{type:'photo', src:px(10387061,'pexels-photo-10387061.jpeg'), alt:'Allume-feu en laine de bois'} },
  { id:21, category:'allumage', name:'Briquettes de bois', unit:'colis de 10 kg', price:11.90, stock:100,
    desc:'Briquettes de sciure compressée à combustion lente, idéales en complément des bûches classiques.',
    media:{type:'photo', src:px(8075980,'pexels-photo-8075980.jpeg'), alt:'Briquettes de bois compressé'} },
  { id:22, category:'allumage', name:'Bûches de nuit / longue combustion', unit:'lot de 6', price:16.90, stock:100,
    desc:'Bûches spéciales à combustion très lente, conçues pour tenir le foyer allumé toute la nuit.',
    media:{type:'photo', src:px(26938934,'free-photo-of-close-up-of-a-bonfire-in-a-garden.jpeg'), alt:'Bûche de nuit longue combustion'} },
  { id:23, category:'allumage', name:'Granulés de bois – sac', unit:'sac de 15 kg', price:7.90, stock:100,
    desc:'Granulés 100 % résineux certifiés, faible taux de cendres, pour poêles et chaudières à pellets.',
    media:{type:'photo', src:px(31797933,'free-photo-of-warm-campfire-flames-in-outdoor-setting.jpeg'), alt:'Sac de granulés de bois'} },
  { id:24, category:'allumage', name:'Pellets premium – sac', unit:'sac de 15 kg', price:9.90, stock:100, badge:'Premium',
    desc:'Pellets premium à haut pouvoir calorifique et faible humidité, pour un rendement optimal de votre appareil.',
    media:{type:'photo', src:px(37816769,'free-photo-of-warm-cozy-outdoor-fire-pit-in-garden-setting.jpeg'), alt:'Pellets premium en sac'} },

  // ---------------- AUTRES CATÉGORIES (hors accueil et hors « Bois de chauffage ») ----------------
  { id:101, category:'cartes-graphiques', name:'ASUS DUAL GeForce RTX 5060 Ti 16 Go GDDR7 OC', unit:'unité', price:979.95, stock:100,
    desc:'Carte graphique ASUS DUAL RTX 5060 Ti OC, 16 Go GDDR7, PCIe 5.0, DLSS 4. Performances solides en 1080p et jusqu\'en 1440p, refroidissement 2 ventilateurs Axial-tech, format compact (229 mm).',
    media:{type:'photo', src:'/assets/img/products/gpu-asus-dual-rtx5060ti.jpg', alt:'Carte graphique ASUS DUAL GeForce RTX 5060 Ti 16 Go'} },
  { id:102, category:'cartes-graphiques', name:'MSI GeForce RTX 5070 Ti 16G GAMING TRIO OC', unit:'unité', price:1529.95, stock:100,
    desc:'Carte graphique MSI RTX 5070 Ti, 16 Go GDDR7 sur bus 256 bits, 8960 processeurs de flux, DLSS 4. Refroidissement TRI FROZR 4, éclairage RGB, 3 DisplayPort + HDMI 2.1b. Pensée pour le 1440p et jusqu\'au 4K.',
    media:{type:'photo', src:'/assets/img/products/gpu-msi-rtx5070ti-gaming-trio.jpg', alt:'Carte graphique MSI GeForce RTX 5070 Ti GAMING TRIO OC'} },
  { id:103, category:'cartes-graphiques', name:'MSI GeForce RTX 5060 Ti 16G VENTUS 2X OC PLUS', unit:'unité', price:939.95, stock:100,
    desc:'Carte graphique MSI RTX 5060 Ti, 16 Go GDDR7, 4608 processeurs de flux, DLSS 4. Double ventilateur Torx 5.0 avec technologie ZERO FROZR, 180 W, 227 mm. Idéale du 1080p au 1440p.',
    media:{type:'photo', src:'/assets/img/products/gpu-msi-rtx5060ti-ventus-2x.jpg', alt:'Carte graphique MSI GeForce RTX 5060 Ti VENTUS 2X OC PLUS'} },
  { id:104, category:'cartes-graphiques', name:'ASUS ROG Astral GeForce RTX 5080 16 Go GDDR7 OC', unit:'unité', price:2249.95, stock:100, badge:'Haut de gamme',
    desc:'Carte graphique ASUS ROG Astral RTX 5080 OC, 16 Go GDDR7, 10752 processeurs de flux, boost 2790 MHz. Refroidissement 4 ventilateurs avec chambre à vapeur, éclairage RGB, format 3,8 slots. Conçue pour le 4K.',
    media:{type:'photo', src:'/assets/img/products/gpu-asus-rog-astral-rtx5080.jpg', alt:'Carte graphique ASUS ROG Astral GeForce RTX 5080'} },
  { id:105, category:'gaming', name:'Xbox Series X 1 To – Noir (neuf)', unit:'console', price:987.85, stock:100,
    desc:'Console Microsoft Xbox Series X, 1 To de stockage, coloris noir. Vendue neuve, console seule.',
    media:{type:'photo', src:'/assets/img/products/xbox-series-x.jpg', alt:'Console Microsoft Xbox Series X 1 To noire'} },
  { id:106, category:'irrigation', name:'Motopompe sur prise de force LIDERFARM 80 m³/h – micro-tracteur 10 à 50 CV', unit:'unité', price:825.37, stock:100, badge:'Promo -17 %',
    desc:'Motopompe agricole sur prise de force, débit maxi 80 m³/h, aspiration jusqu\'à 10 m, refoulement jusqu\'à 30 m, raccords Ø 100 mm. Remplit ou vide mares, étangs et fossés. Crépine, colliers et cardan fournis. 75 kg.',
    media:{type:'photo', src:'/assets/img/products/motopompe-liderfarm-80.jpg', alt:'Motopompe LIDERFARM sur prise de force'} },
  { id:107, category:'remorques', name:'Remorque benne basculante Lider 35560 double essieu – caisse 365 x 159 cm, PTAC 750 kg', unit:'unité', price:1061.77, stock:100, badge:'Promo -56 %',
    desc:'Remorque benne à caisse basculante de 365 x 159 cm, double essieu, PTAC 750 kg. Déchargement rapide du bois, des gravats et des matériaux, sans pelle.',
    media:{type:'photo', src:'/assets/img/products/remorque-benne-lider-35560.jpg', alt:'Remorque benne basculante Lider 35560'} },
  { id:108, category:'tracteurs-agricoles', name:'Arracheuse de pommes de terre ROPA Keiler II – 2020, occasion', unit:'machine', price:137500, stock:1, badge:'Occasion',
    desc:'Machine d\'occasion, année 2020, n° de série 2L0336 : 595 ha / 1 018 h. 2 rangs, trémie avec remplisseur de caisses, 2 tapis tamiseurs, 4 tapis à hérissons, double peigne à doigts, table de tri, palettes à fanes réglables électriquement, reprise d\'oignons supplémentaire.',
    media:{type:'icon', icon:'truck'} },
  { id:109, category:'lunettes-soleil', name:'Lunettes de soleil La Miss Saint Trop', unit:'paire', price:150.0, stock:100,
    desc:'Monture solaire carrée en acétate. Verres polarisés catégorie 3 (UV3), organiques, avec traitement anti-reflet face arrière. Largeur des verres 58 mm, pont 18 mm, branches 145 mm.',
    media:{type:'icon', icon:'package'} },
  { id:110, category:'lunettes-soleil', name:'Lunettes de soleil La Summer Vibe', unit:'paire', price:150.0, stock:100,
    desc:'Monture solaire hexagonale en combiné acétate – métal. Verres polarisés catégorie 3 (UV3), organiques, avec traitement anti-reflet face arrière. Largeur des verres 51 mm, pont 20 mm, branches 145 mm.',
    media:{type:'icon', icon:'package'} },
  { id:111, category:'lunettes-soleil', name:'Lunettes de soleil La Miss Rhode', unit:'paire', price:150.0, stock:100,
    desc:'Monture solaire rectangulaire en acétate (détails métal). Verres polarisés catégorie 3 (UV3), organiques, avec traitement anti-reflet face arrière. Largeur des verres 49 mm, pont 22 mm, branches 145 mm.',
    media:{type:'icon', icon:'package'} },
  { id:112, category:'lunettes-soleil', name:'Lunettes de soleil La Summer Signature', unit:'paire', price:150.0, stock:100,
    desc:'Monture solaire hexagonale en combiné acétate – métal. Verres polarisés catégorie 3 (UV3), organiques, avec traitement anti-reflet face arrière. Largeur des verres 54 mm, pont 18 mm, branches 140 mm.',
    media:{type:'icon', icon:'package'} },
  { id:113, category:'lunettes-soleil', name:'Lunettes de soleil La Summer Touch', unit:'paire', price:150.0, stock:100,
    desc:'Monture solaire hexagonale en combiné acétate – métal. Verres polarisés catégorie 3 (UV3), organiques, avec traitement anti-reflet face arrière. Largeur des verres 51 mm, pont 18 mm, branches 145 mm.',
    media:{type:'icon', icon:'package'} },
  { id:114, category:'lunettes-soleil', name:'Lunettes de soleil La Miss Seventies', unit:'paire', price:150.0, stock:100,
    desc:'Monture solaire rectangulaire en acétate. Verres polarisés catégorie 3 (UV3), organiques, avec traitement anti-reflet face arrière. Largeur des verres 53 mm, pont 20 mm, branches 145 mm.',
    media:{type:'icon', icon:'package'} }
];

function getCategoryLabel(key){
  const c = CATEGORIES.find(c => c.key === key) || OTHER_CATEGORIES.find(c => c.key === key);
  return c ? c.label : key;
}
function getProductById(id){
  return PRODUCTS.find(p => p.id === Number(id));
}
function formatPrice(value){
  return value.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';
}
