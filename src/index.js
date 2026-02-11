// src/index.js

const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

(async () => {
    try {
        await client.connect();
        console.log('Connected to database');
    } catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
})();

// Initialize Telegraf bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Start command
bot.start((ctx) => {
    ctx.reply('Welcome!');
});

// Handle errors
bot.catch((err) => {
    console.error('Error occurred:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await client.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await client.close();
    process.exit(0);
});

// Start the bot
bot.launch().then(() => {
    console.log('Bot is running...');
}).catch((err) => {
    console.error('Error launching bot:', err);
    process.exit(1);
});
