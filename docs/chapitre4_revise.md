# Chapitre 4 - Realisation de la plateforme 3mmalak

## 4.1 Introduction

Dans ce chapitre, nous presentons la phase de realisation de la plateforme **3mmalak**, une application web de mise en relation entre clients, travailleurs et administrateurs. Apres l'analyse des besoins et la conception UML, cette etape a permis de transformer les modeles theoriques en une solution logicielle complete, interactive et exploitable.

La realisation s'est appuyee sur une architecture separee entre un frontend moderne et un backend securise. L'objectif n'etait pas uniquement de produire des interfaces visuelles, mais de mettre en place un ecosysteme coherent couvrant l'authentification, la gestion des profils, la publication des taches, les reservations, les offres, la moderation administrative, la cartographie, les notifications et le suivi des abonnements des travailleurs.

Ce chapitre decrit donc l'implementation technique retenue, les fonctionnalites realisees par sprint, les interfaces principales de la plateforme ainsi que les resultats obtenus.

## 4.2 Architecture technique de la solution

La plateforme 3mmalak repose sur une architecture client-serveur. Le **frontend** a ete developpe avec **React.js** et **Vite**, ce qui permet une interface reactive et rapide a charger. La couche visuelle exploite des composants modernes, des animations fluides, une navigation par routes et une prise en charge du multilingue arabe/francais.

Le **backend** a ete realise avec **Spring Boot**, en adoptant une organisation par services, DTO, controleurs REST et couches de securite. Cette partie assure la logique metier, la validation des donnees, la persistance dans la base MySQL et la gestion des droits d'acces selon le role de l'utilisateur.

Les principales technologies integrees dans la solution sont les suivantes :

- **React + Vite** pour l'interface utilisateur ;
- **React Router** pour la navigation entre les pages publiques et protegees ;
- **Axios** pour la communication HTTP avec l'API REST ;
- **i18next** pour la gestion du multilingue arabe/francais ;
- **Leaflet / React-Leaflet** pour la geolocalisation et l'affichage des cartes ;
- **Spring Boot** pour la couche serveur ;
- **Spring Security** pour le controle d'acces ;
- **JWT** pour l'authentification stateless ;
- **BCrypt** pour le hachage des mots de passe ;
- **MySQL** pour le stockage principal des donnees ;
- **WebSocket / STOMP** pour certaines notifications temps reel ;
- **Swagger OpenAPI** pour documenter et tester les services exposes ;
- **Tesseract OCR / PDFBox** pour verifier les recus d'abonnement televerses.

Cette architecture permet de separer clairement la presentation, la logique metier et la persistance, tout en facilitant l'evolution future de la plateforme.

## 4.3 Developpement fonctionnel par sprints

Le developpement du projet a ete organise selon une logique iterative. Chaque sprint a apporte un groupe coherent de fonctionnalites directement integrees dans la plateforme.

### 4.3.1 Sprint 1 : Authentification et securite

Le premier sprint a pose la base securitaire de l'application. L'authentification n'est pas basee sur l'e-mail, mais sur le **numero de telephone**, ce qui correspond mieux au contexte d'utilisation vise.

Fonctionnalites realisees :

- inscription d'un utilisateur avec nom, telephone et mot de passe ;
- verification du compte par code OTP ;
- connexion securisee et generation d'un token JWT ;
- reinitialisation du mot de passe ;
- protection des routes privees selon le role ;
- redirection automatique vers l'espace client, travailleur ou administrateur.

Ce sprint a permis de garantir un acces controle aux ressources de la plateforme et d'etablir une base solide pour les modules suivants.

### 4.3.2 Sprint 2 : Gestion du profil travailleur

Le deuxieme sprint a ete consacre a la creation du module travailleur. L'objectif etait de permettre a un utilisateur de devenir prestataire de services et de completer un profil professionnel exploitable par les clients.

Fonctionnalites realisees :

- creation d'un profil travailleur depuis l'interface `BecomeWorker` ;
- saisie des informations professionnelles : metier, nom, localisation, bio, competences et disponibilite ;
- televersement de la photo de profil ;
- televersement des documents d'identite ;
- consultation et modification du profil travailleur ;
- gestion de l'etat `AVAILABLE` / `BUSY`.

Le profil travailleur represente une composante centrale de la plateforme, car il conditionne la visibilite du prestataire et la confiance accordee par les clients.

### 4.3.3 Sprint 3 : Abonnement et verification des justificatifs

Le projet comporte egalement un mecanisme d'abonnement pour certains travailleurs. Ce sprint a integre un circuit complet de soumission et de verification.

Fonctionnalites realisees :

- affichage des informations de paiement de l'abonnement ;
- saisie de la reference de transaction ;
- televersement du recu de paiement au format image ou PDF ;
- verification automatique partielle via OCR ;
- mise a disposition du recu pour l'administrateur ;
- activation ou rejet de l'abonnement apres controle.

Cette fonctionnalite ajoute une dimension de supervision et de fiabilisation de la plateforme, en particulier pour les comptes professionnels qui necessitent une validation supplementaire.

### 4.3.4 Sprint 4 : Gestion des taches et des offres

Le quatrieme sprint a introduit le coeur operationnel de la plateforme : la publication des taches et la reception des offres des travailleurs.

Fonctionnalites realisees :

- publication d'une tache par un client ;
- saisie du titre, de la description, du metier concerne et de l'adresse ;
- enregistrement facultatif des coordonnees geographiques ;
- affichage public des taches ouvertes ;
- consultation detaillee d'une tache ;
- soumission d'une offre par un travailleur ;
- selection, acceptation ou refus d'une offre ;
- suivi des taches assignees et des taches personnelles.

L'integration de la geolocalisation a permis d'ameliorer la precision des interventions, surtout lorsque l'utilisateur choisit sa position directement sur la carte.

### 4.3.5 Sprint 5 : Gestion des reservations et des evaluations

En plus du systeme de taches, la plateforme offre un mecanisme de reservation directe d'un travailleur. Ce sprint a ainsi complete la logique metier du projet.

Fonctionnalites realisees :

- consultation publique de la fiche detaillee d'un travailleur ;
- creation d'une reservation par le client ;
- acceptation ou rejet de la reservation par le travailleur ;
- marquage de l'intervention comme terminee ;
- evaluation du travailleur apres execution ;
- calcul et affichage de la note moyenne.

Ce module rapproche la plateforme d'un veritable marche de services, dans lequel le client peut soit publier une tache ouverte, soit contacter directement un prestataire.

### 4.3.6 Sprint 6 : Administration et moderation

Le sprint d'administration a permis de mettre en place un tableau de bord central de supervision.

Fonctionnalites realisees :

- tableau de bord administrateur ;
- consultation des statistiques principales ;
- validation ou rejet des profils travailleurs en attente ;
- consultation des documents d'identite ;
- validation ou rejet des taches a moderer ;
- verification des recus d'abonnement ;
- creation de travailleurs depuis l'espace d'administration ;
- promotion d'utilisateurs en administrateurs.

Ce module garantit le bon fonctionnement global de la plateforme et limite les abus grace a une couche de controle humain.

### 4.3.7 Sprint 7 : Notifications et experience utilisateur

Le dernier ensemble d'ameliorations a porte sur la fluidite d'utilisation et le retour d'information vers l'utilisateur.

Fonctionnalites realisees :

- centre de notifications ;
- compteur de notifications non lues ;
- suppression individuelle ou globale des notifications ;
- interfaces animees et reactives ;
- prise en charge du mode multilingue ;
- affichage d'etats de chargement, d'erreur et d'etats vides.

Ces fonctionnalites renforcent l'ergonomie de la plateforme et rendent son usage plus naturel pour les differents profils d'utilisateurs.

## 4.4 Interfaces principales realisees

La partie visible du projet s'appuie sur plusieurs interfaces coherentes entre elles. Chaque interface a ete concue pour repondre a un besoin metier precis.

### 4.4.1 Interface d'accueil

La page d'accueil constitue le point d'entree de la plateforme. Elle met en avant le concept du service, les categories de metiers, les travailleurs recommandes et les appels a l'action permettant soit de publier une demande, soit de rejoindre la plateforme en tant que travailleur.

### 4.4.2 Interface de connexion et d'inscription

Les interfaces d'authentification permettent l'inscription, la verification OTP, la connexion et la reinitialisation du mot de passe. Elles constituent le premier niveau de securisation de l'application.

### 4.4.3 Interface de liste des travailleurs

Cette page permet au client de consulter les profils disponibles, de filtrer les travailleurs et d'acceder a leur fiche detaillee. Elle sert de vitrine principale pour les prestataires.

### 4.4.4 Interface de profil travailleur

La fiche travailleur affiche les informations professionnelles, la disponibilite, les competences, les photos et les avis. Depuis cette page, le client peut egalement lancer une reservation.

### 4.4.5 Interface de gestion des taches

Les pages des taches permettent de publier une nouvelle demande, consulter les taches ouvertes, visualiser les details, inserer une position geographique et suivre l'etat d'avancement des missions.

### 4.4.6 Tableau de bord client

Le tableau de bord client centralise :

- les taches publiees ;
- les offres recues ;
- les reservations effectuees ;
- les actions de modification, d'annulation ou de cloture.

Cette interface donne a l'utilisateur une vision globale de son activite sur la plateforme.

### 4.4.7 Tableau de bord travailleur

Le tableau de bord travailleur regroupe plusieurs volets :

- demandes de reservation recues ;
- offres envoyees ;
- taches assignees ;
- etat de disponibilite ;
- profil personnel et professionnel ;
- paiement et suivi d'abonnement ;
- historique des evaluations.

Il s'agit d'une interface riche qui constitue l'espace de travail principal du prestataire.

### 4.4.8 Tableau de bord administrateur

Le tableau de bord administrateur regroupe la supervision globale :

- gestion des travailleurs ;
- moderation des taches ;
- consultation des justificatifs ;
- statistiques principales ;
- suivi des demandes en attente ;
- gestion du profil administrateur.

Cette interface joue un role essentiel dans la gouvernance de la plateforme.

## 4.5 Resultats obtenus

La phase de realisation a permis d'obtenir une plateforme web complete et fonctionnelle repondant aux besoins identifies au debut du projet. Les principaux resultats obtenus sont les suivants :

- une authentification securisee par numero de telephone ;
- une gestion differenciee des roles `USER`, `WORKER` et `ADMIN` ;
- un systeme de publication des taches et de gestion des offres ;
- un mecanisme de reservation directe des travailleurs ;
- une administration centralisee avec moderation et verification ;
- une integration de la cartographie pour enrichir la localisation ;
- un systeme de notification pour ameliorer l'interaction ;
- une interface multilingue adaptee aux utilisateurs arabophones et francophones.

D'un point de vue technique, la separation entre frontend et backend a facilite la maintenance du code, tandis que l'usage d'API REST documentees a simplifie le test et l'integration des fonctionnalites.

## 4.6 Validation et qualite

Pour assurer la fiabilite de la solution, plusieurs formes de verification ont ete prises en compte :

- tests manuels des parcours principaux ;
- verification des acces selon les roles ;
- controle de la validation des formulaires ;
- verification des appels API via Swagger ;
- presence de tests automatises cote backend pour l'authentification, les taches, les reservations et certains comportements critiques.

La plateforme obtenue constitue ainsi une base solide pour une mise en production progressive et pour de futures evolutions.

## 4.7 Conclusion

En conclusion, ce chapitre a presente la realisation effective de la plateforme 3mmalak. Le projet ne s'est pas limite a la creation d'interfaces statiques, mais a donne naissance a une application web complete integreant securite, gestion des utilisateurs, publication de taches, reservation de travailleurs, administration, geolocalisation, notifications et verification documentaire.

Les fonctionnalites implementees montrent que la solution repond aux exigences fonctionnelles du cahier des charges tout en restant evolutive. Cette realisation confirme la faisabilite technique du projet et prepare naturellement l'etape de bilan general et de perspectives d'amelioration.
