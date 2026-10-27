# WooExtractor — boutique de bois de chauffage

Site statique (HTML / CSS / JS, sans framework) + fonctions serverless Vercel
pour le paiement et les notifications. **Aucune base de données, aucun
tableau de bord admin.** Les 42 produits sont codés en dur dans
`assets/js/products.js`. Chaque commande est enregistrée uniquement dans le
`localStorage` du navigateur du client, ce qui lui permet de retrouver sa
commande et son statut (page « Suivi de commande »), sans serveur de
stockage.

Le site est exploité par la société **D&D Bois de Chauffage** (SARL) sous le
nom commercial **WooExtractor**.

## Modes de paiement

1. **Carte bancaire — Verzapay.** Redirection vers la page de paiement sécurisée (3D Secure) de la passerelle ; aucun champ carte sur le site.
   `api/verzapay-create.js` **recalcule le montant côté serveur** (catalogue + règles de livraison), crée le paiement en EUR (la passerelle convertit vers la devise du pays du client) et vérifie que le montant débité confirmé est exactement celui attendu, **sans envoyer aucun e-mail** : le détail de la commande voyage dans les `metadata` du paiement (aucune base de données) et n'est transmis au marchand par e-mail qu'une fois le paiement confirmé. Si la passerelle ne confirme pas les métadonnées, le paiement est refusé. `api/verzapay-webhook.js` (jeton secret dans l'URL + relecture du statut et des métadonnées par l'API, car la passerelle ne signe pas ses webhooks) envoie **la commande complète** uniquement pour un paiement `completed` ; si les métadonnées manquent, une alerte « paiement reçu sans détail » est envoyée. `api/verzapay-status.js` donne le statut à la page de confirmation et au suivi (la passerelle ne ramène pas le client sur le site). `api/countries.js` fournit les pays (Europe et Amériques, France en premier) synchronisés depuis la passerelle.
2. **Cryptomonnaie — NowPayments.** Facture hébergée, redirection vers la
   page de paiement NowPayments puis retour sur `order-success.html`.
3. **Virement bancaire.** Aucune passerelle : la commande est enregistrée,
   les coordonnées bancaires sont affichées au client, et un e-mail est
   envoyé immédiatement au marchand via Brevo pour suivre la réception du
   virement.
4. **Commander sans payer.** La commande est enregistrée sans paiement ; un
   e-mail est envoyé au marchand via Brevo pour lui rappeler d'envoyer
   manuellement un lien de paiement Payoneer à l'adresse e-mail du client.

Aucun e-mail n'est jamais envoyé automatiquement au client.

## Arborescence

```
/index.html                    Page d'accueil
/favicon.svg, favicon.ico, …    Favicon (SVG + PNG multi-résolutions)
/robots.txt, /sitemap.xml       SEO
/site.webmanifest               Icônes et métadonnées d'application
/pages/produits.html            Catalogue (filtres, recherche, tri)
/pages/panier.html              Panier
/pages/checkout.html            Livraison + choix du paiement
/pages/order-success.html       Confirmation après commande / paiement
/pages/suivi.html               Suivi de commande (recherche + historique local)
/pages/contact.html             Coordonnées
/pages/mentions-legales.html    Informations légales de l'entreprise
/assets/css/style.css           Système de design (une seule feuille de style)
/assets/js/products.js          Catalogue des 42 produits (données figées)
/assets/js/cart.js              Panier + commandes en localStorage
/assets/js/icons.js             Icônes SVG en ligne (aucune emoji sur le site)
/assets/js/*.js                 Logique de chaque page
/lib/brevo.js                   Envoi d'e-mails de notification (Brevo)
/api/verzapay-create.js         Crée le paiement carte (montant recalculé serveur), notifie le marchand
/api/verzapay-webhook.js        Confirme le paiement carte (jeton + relecture API)
/api/verzapay-status.js         Statut d'un paiement carte
/api/countries.js               Pays proposés (Europe et Amériques, synchronisés)
/lib/verzapay.js, /lib/pricing.js  Client de la passerelle, calcul serveur des prix
/api/nowpayments.js             Crée une facture crypto
/api/nowpayments-ipn.js         Webhook crypto, notifie le marchand
/api/notify-order.js            Notifie le marchand (virement / sans paiement)
```

## Déploiement sur Vercel

1. Poussez ce dossier sur GitHub puis importez le projet dans Vercel.
2. Vercel détecte automatiquement `/api` comme fonctions serverless Node et
   installe `package.json`  au build ; aucun réglage de
   build n'est nécessaire pour le site statique.
3. Renseignez les variables d'environnement ci-dessous.
4. Déployez. Le site est servi à la racine, les pages sous `/pages/...`.

### Variables d'environnement à définir sur Vercel

| Variable | Description |
|---|---|
| `VERZAPAY_API_KEY` | Clé secrète de la passerelle carte (`vpz_sk_...`) |
| `VERZAPAY_WEBHOOK_TOKEN` | Jeton secret (24+ caractères) à ajouter à l'URL du webhook : `https://wooextractor.com/api/verzapay-webhook?k=<jeton>` |
| `NOWPAYMENTS_API_KEY` | Clé API NowPayments |
| `NOWPAYMENTS_IPN_SECRET` | Secret IPN NowPayments, pour vérifier la signature du webhook |
| `BREVO_API_KEY` | Clé API Brevo (transactionnel e-mail) |
| `ADMIN_EMAIL` | Adresse qui doit recevoir chaque commande |
| `SHOP_EMAIL` | Adresse expéditrice des e-mails (doit être validée dans Brevo) |
| `NEXT_PUBLIC_BASE_URL` | URL publique du site, ex. `https://wooextractor.com` (sans slash final) |

### Configurer la passerelle carte
1. Validez le compte marchand (KYC) chez la passerelle et créez la clé secrète → `VERZAPAY_API_KEY`.
2. Générez un jeton aléatoire de 24+ caractères → `VERZAPAY_WEBHOOK_TOKEN`.
3. Dans l'espace Développeur de la passerelle, renseignez l'URL de webhook : `https://wooextractor.com/api/verzapay-webhook?k=<votre jeton>` (HTTPS obligatoire).
4. Testez un paiement sans le finaliser : la page doit afficher le montant exact, en euros (ou dans la devise du pays du client).

## Points importants à vérifier avant mise en production

- **Notification marchand par e-mail (Brevo)** : c'est le seul moyen de
  « recevoir les commandes », puisqu'il n'y a ni base de données ni tableau
  de bord. Testez chaque mode de paiement en environnement de test avant la
  mise en ligne pour confirmer que `ADMIN_EMAIL` reçoit bien l'e-mail
  correspondant.
- **Virement bancaire et commande sans paiement** n'ont aucune vérification
  automatique : le suivi (réception du virement, envoi du lien Payoneer)
  est entièrement manuel, à partir de l'e-mail reçu.
- **Suivi de commande** : le stockage étant 100 % local au navigateur, un
  client ne peut retrouver sa commande que depuis l'appareil et le
  navigateur utilisés pour la commande. C'est une limite assumée du choix
  « pas de base de données ».
- **Photos produits** : les bûches, packs et combustibles utilisent des
  photographies libres de droits (Pexels). Les accessoires et produits
  d'entretien (paniers, pinces, gants, kits de ramonage…) utilisent des
  pictogrammes dessinés plutôt que des photos, faute de photo produit réelle
  et libre de droits disponible pour chaque référence exacte. Remplacez ces
  pictogrammes par vos propres photos produit dès que possible.
- **Domaine** : les balises SEO (canonical, Open Graph, sitemap, robots.txt)
  pointent vers `https://wooextractor.com`. Mettez à jour ces fichiers si le
  nom de domaine final est différent.

## Modifier le catalogue

Tout se passe dans `assets/js/products.js` : chaque produit est un objet
`{ id, category, name, unit, price, stock, desc, media }`. Pour changer un
prix, un stock ou un texte, éditez directement cette valeur — il n'y a pas
d'interface d'administration par choix.

## Flux produits (Meta / Google Merchant)

`feed.xml` (https://wooextractor.com/feed.xml) liste tous les produits de
`assets/js/products.js` au format RSS 2.0 avec le namespace `g:`. Après toute
modification des produits ou des prix, régénérez-le puis poussez-le :

```bash
node scripts/generate-feed.mjs
```

## Suivi (Google Analytics / Tag Manager)

Le tag gtag.js (`G-W43KE8BBTB`) et Google Tag Manager (`GTM-WWLR2PTP`) sont
installés dans le `<head>` de toutes les pages HTML, avec le `noscript` GTM
juste après `<body>`.

## Politiques (conformité Google Merchant Center)
Pages : `/pages/politique-de-retour` (**retour sous 30 jours**, **remboursement sous 14 jours**, frais de retour à la charge du client sauf défaut/erreur), `/pages/livraison`, `/pages/conditions-generales-de-vente`, `/pages/confidentialite`, `/pages/cookies`, `/pages/mentions-legales`, liées dans le pied de page et le sitemap. Dans Merchant Center (Paramètres > Expédition et retours), saisissez les mêmes valeurs : retours 30 jours, frais de retour payants (gratuits en cas de défaut), délai de traitement 2-3 jours, expédition offerte dès 150 €, 9,90 € sinon, France métropolitaine.
