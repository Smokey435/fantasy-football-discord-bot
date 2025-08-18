const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');

// Configuration - YOU NEED TO CHANGE THESE
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SLEEPER_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Sleeper API base URL
const SLEEPER_API = 'https://api.sleeper.app/v1';

// Bot ready event
client.once('ready', async () => {
    console.log(`${client.user.tag} is online and ready!`);
    
    // Register slash commands
    const commands = [
        new SlashCommandBuilder()
            .setName('standings')
            .setDescription('Show current league standings'),
        new SlashCommandBuilder()
            .setName('matchup')
            .setDescription('Show matchups for a specific week')
            .addIntegerOption(option => 
                option.setName('week')
                    .setDescription('Week number (1-18)')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('roster')
            .setDescription('Show a team\'s roster')
            .addStringOption(option =>
                option.setName('team')
                    .setDescription('Team name or owner name')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('trades')
            .setDescription('Show recent trades'),
        new SlashCommandBuilder()
            .setName('waivers')
            .setDescription('Show recent waiver moves')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('Slash commands registered successfully!');
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

// Slash command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
        if (commandName === 'standings') {
            await handleStandings(interaction);
        } else if (commandName === 'matchup') {
            await handleMatchup(interaction);
        } else if (commandName === 'roster') {
            await handleRoster(interaction);
        } else if (commandName === 'trades') {
            await handleTrades(interaction);
        } else if (commandName === 'waivers') {
            await handleWaivers(interaction);
        }
    } catch (error) {
        console.error(`Error handling ${commandName}:`, error);
        await interaction.reply({ content: 'Something went wrong! Please try again.', ephemeral: true });
    }
});

// Get current NFL week
async function getCurrentWeek() {
    try {
        const response = await axios.get(`${SLEEPER_API}/state/nfl`);
        return response.data.week;
    } catch (error) {
        console.error('Error getting current week:', error);
        return 1;
    }
}

// Handle standings command
async function handleStandings(interaction) {
    await interaction.deferReply();
    
    try {
        // Get league info
        const leagueResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}`);
        const league = leagueResponse.data;
        
        // Get rosters
        const rostersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`);
        const rosters = rostersResponse.data;
        
        // Get users
        const usersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`);
        const users = usersResponse.data;
        
        // Create user lookup
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Sort rosters by wins, then by points
        const sortedRosters = rosters
            .map(roster => ({
                ...roster,
                owner_name: userLookup[roster.owner_id] || 'Unknown',
                win_pct: roster.settings.wins / (roster.settings.wins + roster.settings.losses)
            }))
            .sort((a, b) => {
                if (b.settings.wins !== a.settings.wins) {
                    return b.settings.wins - a.settings.wins;
                }
                return b.settings.fpts - a.settings.fpts;
            });
        
        // Create standings embed
        const embed = new EmbedBuilder()
            .setTitle(`${league.name} - Standings`)
            .setColor(0x0099FF)
            .setTimestamp();
        
        let standingsText = '';
        sortedRosters.forEach((roster, index) => {
            const wins = roster.settings.wins;
            const losses = roster.settings.losses;
            const points = roster.settings.fpts.toFixed(1);
            standingsText += `**${index + 1}.** ${roster.owner_name}\n`;
            standingsText += `${wins}-${losses} • ${points} pts\n\n`;
        });
        
        embed.setDescription(standingsText);
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in standings:', error);
        await interaction.editReply('Error getting standings. Please try again!');
    }
}

// Handle matchup command
async function handleMatchup(interaction) {
    await interaction.deferReply();
    
    const week = interaction.options.getInteger('week') || await getCurrentWeek();
    
    try {
        // Get matchups
        const matchupsResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`);
        const matchups = matchupsResponse.data;
        
        // Get users
        const usersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`);
        const users = usersResponse.data;
        
        // Get rosters
        const rostersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`);
        const rosters = rostersResponse.data;
        
        // Create lookups
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        const rosterLookup = {};
        rosters.forEach(roster => {
            rosterLookup[roster.roster_id] = userLookup[roster.owner_id] || 'Unknown';
        });
        
        // Group matchups by matchup_id
        const matchupGroups = {};
        matchups.forEach(matchup => {
            if (!matchupGroups[matchup.matchup_id]) {
                matchupGroups[matchup.matchup_id] = [];
            }
            matchupGroups[matchup.matchup_id].push(matchup);
        });
        
        // Create embed
        const embed = new EmbedBuilder()
            .setTitle(`Week ${week} Matchups`)
            .setColor(0x00FF00)
            .setTimestamp();
        
        let matchupText = '';
        Object.values(matchupGroups).forEach(group => {
            if (group.length === 2) {
                const team1 = group[0];
                const team2 = group[1];
                const name1 = rosterLookup[team1.roster_id];
                const name2 = rosterLookup[team2.roster_id];
                const points1 = team1.points ? team1.points.toFixed(1) : '0.0';
                const points2 = team2.points ? team2.points.toFixed(1) : '0.0';
                
                matchupText += `**${name1}** (${points1}) vs **${name2}** (${points2})\n\n`;
            }
        });
        
        embed.setDescription(matchupText || 'No matchups found for this week.');
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in matchup:', error);
        await interaction.editReply('Error getting matchups. Please try again!');
    }
}

// Handle roster command  
async function handleRoster(interaction) {
    await interaction.deferReply();
    
    const teamName = interaction.options.getString('team');
    
    try {
        // Get league data
        const [rostersResponse, usersResponse, playersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`),
            axios.get(`${SLEEPER_API}/players/nfl`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        const players = playersResponse.data;
        
        // Create user lookup
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Find the roster
        let targetRoster;
        if (teamName) {
            targetRoster = rosters.find(roster => {
                const ownerName = userLookup[roster.owner_id]?.toLowerCase() || '';
                return ownerName.includes(teamName.toLowerCase());
            });
        } else {
            targetRoster = rosters[0]; // First roster if no team specified
        }
        
        if (!targetRoster) {
            await interaction.editReply('Team not found! Try using part of the team owner\'s name.');
            return;
        }
        
        const ownerName = userLookup[targetRoster.owner_id] || 'Unknown';
        const wins = targetRoster.settings.wins;
        const losses = targetRoster.settings.losses;
        const points = targetRoster.settings.fpts.toFixed(1);
        
        // Get starters
        const starters = targetRoster.starters || [];
        const bench = (targetRoster.players || []).filter(p => !starters.includes(p));
        
        // Format players
        const formatPlayers = (playerIds) => {
            return playerIds.map(id => {
                const player = players[id];
                if (!player) return `Unknown (${id})`;
                return `${player.first_name} ${player.last_name} (${player.position})`;
            });
        };
        
        const embed = new EmbedBuilder()
            .setTitle(`${ownerName}'s Roster`)
            .setDescription(`Record: ${wins}-${losses} • ${points} points`)
            .setColor(0xFF6600)
            .addFields(
                { 
                    name: '🏈 Starters', 
                    value: formatPlayers(starters).join('\n') || 'None', 
                    inline: false 
                },
                { 
                    name: '🪑 Bench', 
                    value: formatPlayers(bench).join('\n') || 'None', 
                    inline: false 
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in roster:', error);
        await interaction.editReply('Error getting roster. Please try again!');
    }
}

// Handle trades command
async function handleTrades(interaction) {
    await interaction.deferReply();
    
    try {
        const currentWeek = await getCurrentWeek();
        
        // Get recent transactions
        const transactionsResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/transactions/${currentWeek}`);
        const transactions = transactionsResponse.data;
        
        // Filter trades
        const trades = transactions.filter(t => t.type === 'trade').slice(0, 5);
        
        if (trades.length === 0) {
            await interaction.editReply('No recent trades found!');
            return;
        }
        
        // Get users and players for context
        const [usersResponse, playersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`),
            axios.get(`${SLEEPER_API}/players/nfl`)
        ]);
        
        const users = usersResponse.data;
        const players = playersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        const embed = new EmbedBuilder()
            .setTitle('Recent Trades')
            .setColor(0xFF0000)
            .setTimestamp();
        
        let tradeText = '';
        trades.forEach((trade, index) => {
            const date = new Date(trade.status_updated).toLocaleDateString();
            tradeText += `**Trade ${index + 1}** (${date})\n`;
            tradeText += `Details available in league transaction history\n\n`;
        });
        
        embed.setDescription(tradeText);
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in trades:', error);
        await interaction.editReply('Error getting trades. Please try again!');
    }
}

// Handle waivers command
async function handleWaivers(interaction) {
    await interaction.deferReply();
    
    try {
        const currentWeek = await getCurrentWeek();
        
        // Get recent transactions
        const transactionsResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/transactions/${currentWeek}`);
        const transactions = transactionsResponse.data;
        
        // Filter waiver claims
        const waivers = transactions.filter(t => 
            t.type === 'waiver' || t.type === 'free_agent'
        ).slice(0, 10);
        
        if (waivers.length === 0) {
            await interaction.editReply('No recent waiver activity!');
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle('Recent Waiver Activity')
            .setColor(0x9932CC)
            .setDescription(`${waivers.length} recent moves found`)
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in waivers:', error);
        await interaction.editReply('Error getting waiver activity. Please try again!');
    }
}

// Automated weekly matchup preview (Tuesdays at 10 AM)
cron.schedule('0 10 * * 2', async () => {
    try {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (!channel) return;
        
        const currentWeek = await getCurrentWeek();
        
        const embed = new EmbedBuilder()
            .setTitle(`🏈 Week ${currentWeek} Preview`)
            .setDescription('New week is here! Use `/matchup` to see all matchups!')
            .setColor(0x00FF00)
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        console.log(`Sent week ${currentWeek} preview`);
    } catch (error) {
        console.error('Error sending weekly preview:', error);
    }
});

// Weekly results recap (Tuesdays at 8 AM)
cron.schedule('0 8 * * 2', async () => {
    try {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (!channel) return;
        
        const lastWeek = (await getCurrentWeek()) - 1;
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Week ${lastWeek} Results`)
            .setDescription('Check out last week\'s results with `/matchup ' + lastWeek + '`!')
            .setColor(0x0099FF)
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        console.log(`Sent week ${lastWeek} results recap`);
    } catch (error) {
        console.error('Error sending weekly recap:', error);
    }
});

4. Scroll down and click "Commit new file"

### Create package.json File:
1. Click "Add file" → "Create new file" again
2. Name this file: `package.json`
3. Copy and paste this content:

```json
{
  "name": "fantasy-football-bot",
  "version": "1.0.0",
  "description": "Discord bot for fantasy football updates",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "discord.js": "^14.7.1",
    "axios": "^1.3.4",
    "node-cron": "^3.0.2"
  }
}
