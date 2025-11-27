import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  console.error('⚠️ DISCORD_TOKEN não definido no .env');
  process.exit(1);
}

const IDS = [
  '983541103292739584',
];

async function fetchDiscordUser(id) {
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${id}/profile`, {
      headers: {
        Authorization: `${DISCORD_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao buscar ID ${id}: ${await res.text()}`);
    }

    return await res.json();
  } catch (error) {
    return { id, error: error.message };
  }
}

app.get('/not', async (req, res) => {
  if (IDS.length === 0) {
    return res.status(400).json({ error: 'Nenhum ID definido no código' });
  }

  try {
    const results = await Promise.all(IDS.map(id => fetchDiscordUser(id.trim())));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API Ligada`);
});
