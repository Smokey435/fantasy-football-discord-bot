const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SLEEPER_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const SLEEPER_API = 'https://api.sleeper.app/v1';

client.once('ready', async () => {
    console.log(`${client.user.tag} is online and ready!`);
    
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

async function getCurrentWeek() {
    try {
        const response = await axios.get(`${SLEEPER_API}/state/nfl`);
        return response.data.week;
    } catch (error) {
        console.error('Error getting current week:', error);
        return 1;
    }
}

async function handleStandings(interaction) {
    await interaction.deferReply();
    
    try {
        const leagueResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}`);
        const league = leagueResponse.data;
        
        const rostersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`);
        const rosters = rostersResponse.data;
        
        const usersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`);
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        const sortedRosters = rosters
            .map(roster => ({
                ...roster,
                owner_name: userLookup[roster.owner_id] || 'Unknown'
            }))
            .sort((a, b) => {
                if (b.settings.wins !== a.settings.wins) {
                    return b.settings.wins - a.settings.wins;
                }
                return b.settings.fpts - a.settings.fpts;
            });
        
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

async function handleMatchup(interaction) {
    await interaction.deferReply();
    
    const week = interaction.options.getInteger('week') || await getCurrentWeek();
    
    try {
        const matchupsResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`);
        const matchups = matchupsResponse.data;
        
        const usersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`);
        const users = usersResponse.data;
        
        const rostersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`);
        const rosters = rostersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        const rosterLookup = {};
        rosters.forEach(roster => {
            rosterLookup[roster.roster_id] = userLookup[roster.owner_id] || 'Unknown';
        });
        
        const matchupGroups = {};
        matchups.forEach(matchup => {
            if (!matchupGroups[matchup.matchup_id]) {
                matchupGroups[matchup.matchup_id] = [];
            }
            matchupGroups[matchup.matchup_id].push(matchup);
        });
        
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

async function handleRoster(interaction) {
    await interaction.deferReply();
    
    const teamName = interaction.options.getString('team');
    
    try {
        const [rostersResponse, usersResponse, playersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`),
            axios.get(`${SLEEPER_API}/players/nfl`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        const players = playersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        let targetRoster;
        if (teamName) {
            targetRoster = rosters.find(roster => {
                const ownerName = userLookup[roster.owner_id]?.toLowerCase() || '';
                return ownerName.includes(teamName.toLowerCase());
            });
        } else {
            targetRoster = rosters[0];
        }
        
        if (!targetRoster) {
            await interaction.editReply('Team not found! Try using part of the team owner\'s name.');
            return;
        }
        
        const ownerName = userLookup[targetRoster.owner_id] || 'Unknown';
        const wins = targetRoster.settings.wins;
        const losses = targetRoster.settings.losses;
        const points = targetRoster.settings.fpts.toFixed(1);
        
        const starters = targetRoster.starters || [];
        const bench = (targetRoster.players || []).filter(p => !starters.includes(p));
        
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

async function handleTrades(interaction) {
    await interaction.deferReply();
    
    try {
        const currentWeek = await getCurrentWeek();
        const transactionsResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/transactions/${currentWeek}`);
        const transactions = transactionsResponse.data;
        
        const trades = transactions.filter(t => t.type === 'trade').slice(0, 5);
        
        if (trades.length === 0) {
            await interaction.editReply('No recent trades found!');
            return;
        }
        
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

async function handleWaivers(interaction) {
    await interaction.deferReply();
    
    try {
        const currentWeek = await getCurrentWeek();
        const transactionsResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/transactions/${currentWeek}`);
        const transactions = transactionsResponse.data;
        
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

client.login(DISCORD_TOKEN);
