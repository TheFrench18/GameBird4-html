const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static('public'));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Stockage des joueurs connectés
const players = {};
const nests = [];
const eggs = [];

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log('Nouveau joueur connecté:', socket.id);

  // Quand un joueur rejoint avec un pseudo
  socket.on('playerJoin', (data) => {
    players[socket.id] = {
      id: socket.id,
      username: data.username,
      position: { x: 0, y: 5, z: 0 },
      rotation: { horizontal: 0, vertical: 0 },
      color: data.color,
      score: 0,
      isFlying: false,
      hasEgg: false
    };

    // Envoyer au nouveau joueur tous les joueurs existants
    socket.emit('currentPlayers', players);
    
    // Envoyer l'état des nids et œufs
    socket.emit('nestsState', { nests, eggs });

    // Informer les autres joueurs du nouveau joueur
    socket.broadcast.emit('newPlayer', players[socket.id]);

    console.log(`${data.username} a rejoint la partie`);
  });

  // Mise à jour de la position du joueur
  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      players[socket.id].isFlying = data.isFlying;
      
      // Diffuser aux autres joueurs
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: data.position,
        rotation: data.rotation,
        isFlying: data.isFlying
      });
    }
  });

  // Quand un joueur prend un œuf
  socket.on('takeEgg', (data) => {
    if (players[socket.id]) {
      players[socket.id].hasEgg = true;
      players[socket.id].score += 1;
      
      // Informer tous les joueurs
      io.emit('eggTaken', {
        playerId: socket.id,
        nestId: data.nestId,
        eggId: data.eggId
      });
    }
  });

  // Quand un joueur dépose un œuf
  socket.on('dropEgg', (data) => {
    if (players[socket.id]) {
      players[socket.id].hasEgg = false;
      
      // Informer tous les joueurs
      io.emit('eggDropped', {
        playerId: socket.id,
        position: data.position,
        nestId: data.nestId
      });
    }
  });

  // Message du chat
  socket.on('chatMessage', (message) => {
    if (players[socket.id]) {
      io.emit('chatMessage', {
        username: players[socket.id].username,
        message: message,
        color: players[socket.id].color
      });
    }
  });

  // Déconnexion
  socket.on('disconnect', () => {
    if (players[socket.id]) {
      console.log(`${players[socket.id].username} s'est déconnecté`);
      delete players[socket.id];
      io.emit('playerDisconnected', socket.id);
    }
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🦅 Serveur GameBird démarré sur le port ${PORT}`);
  console.log(`🌐 Accédez au jeu sur http://localhost:${PORT}`);
});