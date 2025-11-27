const express = require('express');
const path = require('path');
const fs = require('fs').promises; 
const fetch = require('node-fetch');
const userJson = require('./users.json');
const infosJson = require('./infos.json');
require('dotenv').config();

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('⚠️ DISCORD_TOKEN não definido no .env');
  process.exit(1);
}

async function fetchDiscordUser(id) {
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${id}/profile`, {
      headers: {
        Authorization: `${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.log(`Status: ${res.status}, Error: ${errorText}`);
      throw new Error(`Erro ${res.status} ao buscar ID ${id}: ${errorText}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Erro ao buscar usuário ${id}:`, error.message);
    return { id, error: error.message };
  }
}

// Rota da API para buscar dados do Discord
app.get('/api/discord', async (req, res) => {
  try {
    const users = userJson;
    const results = await Promise.all(
      users.map(user => fetchDiscordUser(user.id.trim()))
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/', async (req, res) => {
  try {
    const users = userJson;
    infosJson.views += 1;

    console.log('Tentando buscar dados do Discord...');

    // Buscar dados do Discord usando nossa própria API
    const usersData = await Promise.all(
      users.map(async (user, index) => {
        try {
          console.log(`Buscando dados para usuário: ${user.id}`);
          const discordData = await fetchDiscordUser(user.id);

          // Normalizar campos esperados pelo template (removido Spotify)
          const normalized = {
            user: (discordData && discordData.user) ? discordData.user : {
              id: user.id,
              username: `unknown_${user.id.slice(-4)}`,
              global_name: null,
              avatar: null
            },
            badges: Array.isArray(discordData && discordData.badges) ? discordData.badges : [],
            connected_accounts: Array.isArray(discordData && discordData.connected_accounts) ? discordData.connected_accounts : [],
          };

          return normalized;
        } catch (error) {
          console.error(`Erro ao buscar o perfil do usuário ${user.id}:`, error);
          const fallback = fallbackData && fallbackData[0] ? fallbackData[0] : {
            user: { id: user.id, username: `error_${user.id.slice(-4)}`, global_name: null, avatar: null },
            badges: [],
            connected_accounts: [],
          };
          return {
            ...fallback,
            user: {
              ...fallback.user,
              id: user.id,
              username: `error_${user.id.slice(-4)}`,
              global_name: `Erro ${index + 1}`
            }
          };
        }
      })
    );

    // Renderizar página principal (ajuste conforme seu template)
    res.render('index', { users: usersData, infos: infosJson });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro interno');
  }
});

const PORT = process.env.PORT || 80;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;

