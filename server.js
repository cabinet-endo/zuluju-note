const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Fonction pour lire le fichier JSON
async function readNotesFile() {
  try {
    const data = await fs.readFile('notes.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Fonction pour écrire dans le fichier JSON
async function writeNotesFile(notes) {
  await fs.writeFile('notes.json', JSON.stringify(notes, null, 2));
}

// Fonction pour calculer la prochaine date de révision
function calculateNextRevisionDate(revisionEtape, difficulte = 'moyenne') {
  const today = new Date();
  let jours;

  switch (revisionEtape) {
    case 0: jours = 1; break;
    case 1: jours = 3; break;
    case 2: jours = 7; break;
    case 3: jours = 14; break;
    case 4: jours = 30; break;
    case 5: jours = 90; break;
    default: jours = 180; break;
  }

  // Ajuster en fonction de la difficulté
  if (difficulte === 'facile') {
    jours = Math.round(jours * 1.5);
  } else if (difficulte === 'difficile') {
    jours = Math.round(jours * 0.5);
  }

  return new Date(today.setDate(today.getDate() + jours));
}

// Route pour créer une nouvelle note
app.post('/api/notes', upload.array('pieces_jointes'), async (req, res) => {
  const { titre, contenu } = req.body;
  const piecesJointes = req.files ? req.files.map(file => file.filename) : [];

  const newNote = {
    id: uuidv4(),
    titre,
    contenu,
    date_creation: new Date(),
    date_revision: calculateNextRevisionDate(0),
    revision_etape: 0,
    pieces_jointes: piecesJointes,
    fin_cycle: false
  };

  const notes = await readNotesFile();
  notes.push(newNote);
  await writeNotesFile(notes);

  res.status(201).json(newNote);
});

// Route pour obtenir toutes les notes
app.get('/api/notes', async (req, res) => {
  const notes = await readNotesFile();
  res.json(notes);
});

// Route pour obtenir les notes à réviser aujourd'hui
app.get('/api/notes/today', async (req, res) => {
  const notes = await readNotesFile();
  const today = new Date();
  const notesToReview = notes.filter(note => {
    const revisionDate = new Date(note.date_revision);
    return revisionDate <= today && !note.fin_cycle;
  });
  res.json(notesToReview);
});

// Route pour marquer une note comme révisée
app.put('/api/notes/:id/review', async (req, res) => {
  const { difficulte } = req.body;
  const notes = await readNotesFile();
  const noteIndex = notes.findIndex(note => note.id === req.params.id);

  if (noteIndex === -1) {
    return res.status(404).json({ message: "Note non trouvée" });
  }

  const note = notes[noteIndex];
  const today = new Date();
  const revisionDate = new Date(note.date_revision);

  // Si la date de révision est dans le passé, on ne l'incrémente pas
  if (revisionDate <= today) {
    note.revision_etape++;
  }

  note.date_revision = calculateNextRevisionDate(note.revision_etape, difficulte);

  if (note.revision_etape >= 6) {
    note.fin_cycle = true;
  }

  await writeNotesFile(notes);
  res.json(note);
});

// Route pour supprimer une note
app.delete('/api/notes/:id', async (req, res) => {
  const notes = await readNotesFile();
  const updatedNotes = notes.filter(note => note.id !== req.params.id);
  await writeNotesFile(updatedNotes);
  res.status(204).send();
});

// Fonction pour supprimer automatiquement les notes en fin de cycle
async function deleteCompletedNotes() {
  const notes = await readNotesFile();
  const updatedNotes = notes.filter(note => !note.fin_cycle);
  await writeNotesFile(updatedNotes);
}

// Fonction pour mettre à jour les dates de révision manquées
async function updateMissedReviews() {
  const notes = await readNotesFile();
  const today = new Date();
  let updated = false;

  notes.forEach(note => {
    const revisionDate = new Date(note.date_revision);
    if (revisionDate < today && !note.fin_cycle) {
      // Si la date de révision est passée, on la met à aujourd'hui
      note.date_revision = today;
      updated = true;
    }
  });

  if (updated) {
    await writeNotesFile(notes);
  }
}

// Exécuter la suppression automatique et la mise à jour des révisions manquées toutes les 24 heures
setInterval(() => {
  deleteCompletedNotes();
  updateMissedReviews();
}, 24 * 60 * 60 * 1000);

// Exécuter la mise à jour des révisions manquées au démarrage du serveur
updateMissedReviews();

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});