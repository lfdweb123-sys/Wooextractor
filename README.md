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

1. **Carte bancaire — Stripe.** Champ de carte intégré (Stripe Elements) sur
   la page de commande, aucune redirection. `api/stripe-create-intent.js`
   crée le paiement, le navigateur le confirme, puis `api/stripe-webhook.js`
   (seule source fiable et signée) envoie un e-mail de commande au marchand
   via Brevo.
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
/api/stripe-config.js           Fournit la clé publiable Stripe au client
/api/stripe-create-intent.js    Crée le paiement carte (PaymentIntent)
/api/stripe-webhook.js          Confirme le paiement carte, notifie le marchand
/api/nowpayments.js             Crée une facture crypto
/api/nowpayments-ipn.js         Webhook crypto, notifie le marchand
/api/notify-order.js            Notifie le marchand (virement / sans paiement)
```

## Déploiement sur Vercel

1. Poussez ce dossier sur GitHub puis importez le projet dans Vercel.
2. Vercel détecte automatiquement `/api` comme fonctions serverless Node et
   installe `package.json` (dépendance `stripe`) au build ; aucun réglage de
   build n'est nécessaire pour le site statique.
3. Renseignez les variables d'environnement ci-dessous.
4. Déployez. Le site est servi à la racine, les pages sous `/pages/...`.

### Variables d'environnement à définir sur Vercel

| Variable | Description |
|---|---|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe (mode test ou live) |
| `STRIPE_PUBLISHABLE_KEY` | Clé publiable Stripe, transmise au navigateur |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook Stripe (`payment_intent.succeeded`) |
| `NOWPAYMENTS_API_KEY` | Clé API NowPayments |
| `NOWPAYMENTS_IPN_SECRET` | Secret IPN NowPayments, pour vérifier la signature du webhook |
| `BREVO_API_KEY` | Clé API Brevo (transactionnel e-mail) |
| `ADMIN_EMAIL` | Adresse qui doit recevoir chaque commande |
| `SHOP_EMAIL` | Adresse expéditrice des e-mails (doit être validée dans Brevo) |
| `NEXT_PUBLIC_BASE_URL` | URL publique du site, ex. `https://wooextractor.com` (sans slash final) |

### Configurer le webhook Stripe

Dans le tableau de bord Stripe → Developers → Webhooks, ajoutez une
destination vers `https://VOTRE-DOMAINE/api/stripe-webhook` écoutant
l'évènement `payment_intent.succeeded`, puis copiez le secret de signature
dans `STRIPE_WEBHOOK_SECRET`.

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
