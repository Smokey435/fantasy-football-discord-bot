const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const express = require('express'); // ADD THIS LINE

// Your existing environment variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SLEEPER_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const SPORTS_API_KEY = process.env.SPORTS_API_KEY;

// ADD THIS SECTION - HTTP Server Setup
const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint
app.get('/', (req, res) => {
    const status = {
        botStatus: client.user ? 'Online' : 'Offline',
        botName: client.user ? client.user.tag : 'Not logged in',
        uptime: `${Math.floor(process.uptime() / 60)} minutes`,
        memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        timestamp: new Date().toISOString()
    };
    
    res.json({
        message: '🏈 Fantasy Bot is running!',
        ...status
    });
});

// Simple ping endpoint
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Health endpoint for monitoring
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

// Start HTTP server
app.listen(PORT, () => {
    console.log(`🌐 HTTP server running on port ${PORT}`);
});

// Your existing Discord client setup continues here...
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});
