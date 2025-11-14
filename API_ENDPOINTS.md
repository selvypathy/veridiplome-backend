# VériDiplôme - Endpoints API

## 🔐 Authentification

### Inscription École
```
POST /api/auth/register/ecole
Body: { email, password, nom_complet, type, ville, telephone, directeur_nom }
```

### Inscription Étudiant
```
POST /api/auth/register/etudiant
Body: { email, password, ine }
```

### Connexion
```
POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### Mon Profil
```
GET /api/auth/me
Headers: Authorization: Bearer {token}
```

---

## 🎓 Étudiants (INE)

### Créer un étudiant avec INE
```
POST /api/etudiants/creer-ine
Headers: Authorization: Bearer {token} (École)
Body: { nom, prenom, date_naissance, lieu_naissance, sexe }
Response: { ine: "INE-XXX-CG-2025-BRAZZA-000001" }
```

### Rechercher par INE
```
GET /api/etudiants/recherche/:ine
Headers: Authorization: Bearer {token}
```

### Vérifier si existe
```
POST /api/etudiants/verifier-existence
Body: { nom, prenom, date_naissance }
```

---

## 🏫 Écoles

### Attribuer un préfixe (Admin)
```
POST /api/ecoles/:ecoleId/attribuer-prefixe
Body: { prefixe: "UMARIEN" }
```

### Valider une école (Admin)
```
PUT /api/ecoles/:ecoleId/valider
```

### Mon école
```
GET /api/ecoles/mon-ecole
Headers: Authorization: Bearer {token} (École)
```

---

## 📄 Documents

### Émettre un diplôme/bulletin
```
POST /api/documents/emettre
Headers: Authorization: Bearer {token} (École)
Content-Type: multipart/form-data
Body: {
  etudiant_ine,
  type: "diplome" ou "bulletin",
  categorie: "CEPE", "BAC", etc.
  niveau,
  annee_scolaire,
  resultat,
  moyenne_generale,
  mention,
  pdf: <fichier>
}
```

### Documents d'un étudiant
```
GET /api/documents/etudiant/:ine
```

### Mes documents (École)
```
GET /api/documents/mes-documents
```

### Télécharger PDF
```
GET /api/documents/:documentId/download
```

### Révoquer un document
```
PUT /api/documents/:documentId/revoquer
Body: { raison }
```

---

## ✅ Vérification Publique (PAS d'authentification)

### Vérifier par INE
```
POST /api/verification/public/ine
Body: { ine: "INE-XXX-CG-2025-BRAZZA-000001" }
Response: {
  valide: true,
  etudiant: { ... },
  diplomes: [ ... ],
  message: "Étudiant vérifié avec succès"
}
```

### Vérifier par QR Code
```
POST /api/verification/public/qrcode
Body: { qr_data: "http://..." }
```

---

## 📊 Statistiques

### Historique vérifications (Admin)
```
GET /api/verification/historique
```

---

## 🧪 Tester avec cURL

```bash
# Inscription école
curl -X POST http://localhost:5000/api/auth/register/ecole \
  -H "Content-Type: application/json" \
  -d '{"email":"ecole@test.cg","password":"Test123!","nom_complet":"École Test","type":"primaire","ville":"Brazzaville"}'

# Vérification publique
curl -X POST http://localhost:5000/api/verification/public/ine \
  -H "Content-Type: application/json" \
  -d '{"ine":"INE-TEST-CG-2025-BRAZZA-000001"}'
```
