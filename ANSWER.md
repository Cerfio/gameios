# Réponse Question 1

## Améliorations techniques à apporter

- Remplacer SQLite par PostgreSQL avec gestion des migrations
- Ajouter un validateur pour les données (express-validator)
- Ajouter des logs (ELK / log4js)
- Ajouter du alerting (Sentry / Rollbar)
- Ajouter des tests (Jest)
- Ajouter une pagination s'il y a trop de données
- Ajouter des métriques (Prometheus / Grafana)
- Mettre en place CI/CD (Github Actions / Gitlab CI)

# Réponse Question 2

## Approche proposée

Mettre en place une queue (SQS / BullMQ / Pub-Sub) qui va recevoir le job. Le job devra contenir l'emplacement / URL / nom du fichier.

Puis deux solutions sont possibles :

### Solution 1 : Lecture directe depuis le microservice populate

#### Avantages :
- Moins de latence (évite un appel HTTP supplémentaire)
- Pas de dépendance à Lambda (moins d'infrastructure AWS spécifique)
- Meilleure gestion du débit si le microservice est optimisé pour traiter des jobs en batch

#### Inconvénients :
- Le microservice doit gérer lui-même la consommation de la queue
- Risque de surcharge si la queue reçoit trop de jobs en même temps

### Solution 2 : Lecture via une lambda (worker) et requête HTTP

#### Avantages :
- Scalabilité automatique avec AWS Lambda (évite de surcharger le microservice)
- Découplage entre la gestion des événements et le traitement dans l'API
- Possibilité de prétraiter les données avant d'appeler l'API

#### Inconvénients :
- Ajoute une latence due à l'appel HTTP
- Coût potentiel plus élevé si le volume de fichiers est très important
