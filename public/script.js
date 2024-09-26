// Fonction pour créer une nouvelle note
async function createNote(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            alert('Note créée avec succès !');
            form.reset();
        } else {
            alert('Erreur lors de la création de la note.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la création de la note.');
    }
}

// Fonction pour afficher toutes les notes
async function displayAllNotes() {
    try {
        const response = await fetch('/api/notes');
        const notes = await response.json();

        const notesList = document.getElementById('notesList');
        notesList.innerHTML = '';

        notes.forEach(note => {
            const noteElement = createNoteElement(note);
            notesList.appendChild(noteElement);
        });
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des notes.');
    }
}

// Fonction pour afficher les notes du jour
async function displayNotesOfTheDay() {
    try {
        const response = await fetch('/api/notes/today');
        const notes = await response.json();

        const notesOfTheDay = document.getElementById('notesOfTheDay');
        notesOfTheDay.innerHTML = '';

        notes.forEach(note => {
            const noteElement = createNoteElement(note, true);
            notesOfTheDay.appendChild(noteElement);
        });
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des notes du jour.');
    }
}

// Fonction pour créer un élément HTML pour une note
function createNoteElement(note, isNoteOfTheDay = false) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note';
    noteDiv.innerHTML = `
        <h2>${note.titre}</h2>
        <p>${note.contenu}</p>
        <p>Date de création: ${new Date(note.date_creation).toLocaleDateString()}</p>
        <p>Date de révision: ${new Date(note.date_revision).toLocaleDateString()}</p>
        <p>Étape de révision: ${note.revision_etape}</p>
        ${note.pieces_jointes.length > 0 ? `<p>Pièces jointes: ${note.pieces_jointes.join(', ')}</p>` : ''}
        <div class="note-actions">
            ${isNoteOfTheDay ? `
                <button onclick="markAsReviewed('${note.id}', 'facile')">Facile</button>
                <button onclick="markAsReviewed('${note.id}', 'moyenne')">Moyenne</button>
                <button onclick="markAsReviewed('${note.id}', 'difficile')">Difficile</button>
            ` : ''}
            <button onclick="deleteNote('${note.id}')">Supprimer</button>
        </div>
    `;
    return noteDiv;
}

// Fonction pour marquer une note comme révisée
async function markAsReviewed(noteId, difficulte) {
    try {
        const response = await fetch(`/api/notes/${noteId}/review`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ difficulte })
        });

        if (response.ok) {
            alert('Note marquée comme révisée !');
            displayNotesOfTheDay();
        } else {
            alert('Erreur lors de la révision de la note.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la révision de la note.');
    }
}

// Fonction pour supprimer une note
async function deleteNote(noteId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                alert('Note supprimée avec succès !');
                // Rafraîchir la liste des notes ou les notes du jour selon la page active
                if (window.location.pathname.includes('liste.html')) {
                    displayAllNotes();
                } else if (window.location.pathname.includes('note-du-jour.html')) {
                    displayNotesOfTheDay();
                }
            } else {
                alert('Erreur lors de la suppression de la note.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la suppression de la note.');
        }
    }
}

// Initialisation des pages
document.addEventListener('DOMContentLoaded', () => {
    const noteForm = document.getElementById('noteForm');
    if (noteForm) {
        noteForm.addEventListener('submit', createNote);
    }

    if (window.location.pathname.includes('liste.html')) {
        displayAllNotes();
    } else if (window.location.pathname.includes('note-du-jour.html')) {
        displayNotesOfTheDay();
    }
});