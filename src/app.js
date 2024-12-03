const express = require('express');
const morgan = require('morgan');
const { join, dirname } = require('path');
const { fileURLToPath } = require('url');
const { readJsonFile, writeJsonFile, fileExists } = require('../utilities/index.js');
const fs = require('fs');
const cors = require('cors');

const app = express();
const htmlDirectory = join(__dirname, '/../html_files');
const documentsJson = join(__dirname, '../documents.json');
const favoritesJson = join(__dirname, '/favorites.json');
app.use(cors({
  origin: 'http://localhost:5173', // Autoriser uniquement votre frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Méthodes HTTP autorisées
  credentials: true // Si vous utilisez des cookies ou des authentifications
}));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store'); 
  next();
});
app.use(morgan('dev'));

// /info endpoint
app.get('/info', (req, res) => {
  res.send('jsau-apiserver-1.0.0');
});

// /search endpoint
// async-promise-async-await
app.get('/search', async (req, res) => {
  const nameparam = req.query.name;

  if (!nameparam) {
    try {
      const docs = await readJsonFile(documentsJson);
      res.json(docs);
    } catch (err) {
      
      res.status(500).json({ error: 'Error parsing JSON data.' });
    }
    return;
  }

  const filepath = join(htmlDirectory, `${nameparam}.html`);
  
  const exists = await fileExists(filepath);
  if (exists) {
    res.sendFile(filepath);
  } else {
    res.status(404).send('File not Found');
  }
});

// /document/:id endpoint
app.get('/document/:id', async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) {
      return res.status(400).send('Invalid document ID.');
    }

    const docs = await readJsonFile(documentsJson);
    const doc = docs.find((u) => u.id === docId);

    if (!doc) {
      return res.status(404).send('Document not found.');
    }

    const filePath = join(
      htmlDirectory,
      `${doc.name.replace(/\s+/g, '_').toLowerCase()}.html`
    );

    const exists = await fileExists(filePath);
    if (exists) {
      res.download(filePath);
    } else {
      res.status(404).send('HTML file not found for the provided document.');
    }
  } catch (err) {
    
    res.status(500).send('Internal server error.');
  }
});

app.post('/favorites', (req, res) => {
  const { username, filename } = req.body;

  if (!username || !filename) {
    return res.status(400).json({ error: 'Username and filename are required.' });
  }

  // async-callback : Vérification si le fichier existe
  fs.access(join(htmlDirectory, filename), fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: 'File does not exist.' });
    }

    // async-callback : Lire les fichiers JSON
    fs.readFile(favoritesJson, 'utf-8', (err, data) => {
      if (err) {
        return res.status(500).json({ error: 'Error reading favorites file.' });
      }

      let favorites;
      try {
        favorites = JSON.parse(data);
      } catch (parseErr) {
        return res.status(500).json({ error: 'Error parsing favorites data.' });
      }

      const exists = favorites.find(
        (fav) => fav.username === username && fav.filename === filename
      );
      if (exists) {
        return res.status(409).json({ error: 'This favorite already exists.' });
      }

      const newFavorite = {
        id: favorites.length + 1,
        username,
        filename,
      };

      favorites.push(newFavorite);

      // async-callback : Écrire le fichier JSON avec les nouveaux favoris
      fs.writeFile(favoritesJson, JSON.stringify(favorites, null, 2), 'utf-8', (writeErr) => {
        if (writeErr) {
          return res.status(500).json({ error: 'An error occurred while writing the favorites file.' });
        }

        res.status(201).json({ message: 'Favorite added successfully!', favorite: newFavorite });
      });
    });
  });
});

// GET /favorites/:username : Récupérer tous les favoris d'un utilisateur
app.get('/favorites/:username', (req, res) => {
  const { username } = req.params;

  // async-promise-then : Lire le fichier JSON des favoris
  readJsonFile(favoritesJson)
    .then((favorites) => {
      const userFavorites = favorites.filter(fav => fav.username === username);

      if (userFavorites.length === 0) {
        return res.status(404).json({ message: `No favorites found for user: ${username}` });
      }

      res.json(userFavorites);
    })
    .catch((err) => {
      // Gestion de l'erreur
      res.status(500).json({ error: 'An error occurred while retrieving favorites.' });
    });
});


// DELETE /favorites : Supprime un favori par username et filename
app.delete('/favorites', async (req, res) => {
  const { username, filename } = req.body;

  if (!username || !filename) {
    return res.status(400).json({ error: 'Username and filename are required.' });
  }

  try {
    const favorites = await readJsonFile(favoritesJson);

    const index = favorites.findIndex(
      fav => fav.username === username && fav.filename === filename
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Favorite not found.' });
    }

    favorites.splice(index, 1);
    await writeJsonFile(favoritesJson, favorites);

    res.status(200).json({ message: 'Favorite deleted successfully.' });
  } catch (err) {
    
    res.status(500).json({ error: 'An error occurred while deleting the favorite.' });
  }
});

module.exports = app;