const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SLEEPER_LEAGUE_ID = process.env.SLEEPER_LEAGUE_ID;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
// Add these for news API (optional - you can use ESPN or other free APIs)
const SPORTS_API_KEY = process.env.SPORTS_API_KEY; // For more detailed news, or use ESPN's free endpoints

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const SLEEPER_API = 'https://api.sleeper.app/v1';

// Sarcastic comment arrays for team write-ups
const SARCASTIC_COMMENTS = {
    winning: [
        "is riding high like they actually know what they're doing",
        "thinks they're a fantasy genius now (spoiler: it's mostly luck)",
        "is acting like they discovered some secret formula (it's called having CMC)",
        "keeps talking about 'their system' as if streaming defenses is rocket science",
        "probably thinks this makes up for their terrible draft"
    ],
    losing: [
        "continues their masterclass in mediocrity",
        "is providing entertainment for the rest of us",
        "somehow makes questionable decisions look like an art form",
        "keeps proving that autodraft would've been better",
        "is single-handedly keeping the waiver wire active"
    ],
    injured: [
        "runs a premium injury ward disguised as a fantasy team",
        "has turned their roster into a hospital patient list",
        "keeps doctors in business with their draft picks",
        "apparently drafted from WebMD instead of expert rankings"
    ],
    trades: [
        "made a trade so bad it should be investigated",
        "somehow convinced someone to accept that highway robbery",
        "pulled off the trade equivalent of selling a car with no engine",
        "negotiated like they were giving away candy on Halloween"
    ],
    bench: [
        "has more points on their bench than in their starting lineup (genius move)",
        "continues the ancient art of starting the wrong players",
        "has a sixth sense for benching players right before they explode",
        "runs their lineup like a broken Magic 8-ball"
    ],
    waivers: [
        "is burning waiver priority faster than money at Vegas",
        "treats the waiver wire like their personal shopping mall",
        "has added and dropped the same player three times this week",
        "apparently thinks quantity over quality applies to roster moves"
    ]
};

const TEAM_NICKNAMES = [
    "The Dream Crushers", "Fantasy Funeral Home", "The Benchwarmer Brigade", 
    "Waiver Wire Warriors", "The Almost-Ran Club", "Injury Reserve FC",
    "The Taco Bell All-Stars", "Championship Pretenders", "The Maybe-Next-Year Squad"
];

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
            .setDescription('Show recent waiver moves'),
        new SlashCommandBuilder()
            .setName('performances')
            .setDescription('Show best and worst weekly performances')
            .addIntegerOption(option =>
                option.setName('week')
                    .setDescription('Week number (default: current week)')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('awards')
            .setDescription('Show season-long achievements and awards'),
        new SlashCommandBuilder()
            .setName('power')
            .setDescription('Power rankings based on recent performance')
            .addIntegerOption(option =>
                option.setName('weeks')
                    .setDescription('Number of recent weeks to analyze (default: 3)')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('playoff')
            .setDescription('Current playoff picture and standings'),
        new SlashCommandBuilder()
            .setName('h2h')
            .setDescription('Head-to-head comparison between teams')
            .addStringOption(option =>
                option.setName('team1')
                    .setDescription('First team name')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('team2')
                    .setDescription('Second team name')
                    .setRequired(true)),
        new SlashCommandBuilder()
            .setName('injuries')
            .setDescription('League-wide injury report for all teams'),
        new SlashCommandBuilder()
            .setName('targets')
            .setDescription('Hot waiver wire targets and trending players'),
        // NEW SARCASTIC COMMANDS
        new SlashCommandBuilder()
            .setName('roast')
            .setDescription('Get a sarcastic write-up of random teams')
            .addIntegerOption(option =>
                option.setName('count')
                    .setDescription('Number of teams to roast (1-4)')
                    .setRequired(false)),
        new SlashCommandBuilder()
            .setName('shame')
            .setDescription('Hall of Shame - worst performances and decisions'),
        new SlashCommandBuilder()
            .setName('news')
            .setDescription('Latest NFL player news and injuries affecting your league')
        client.once('ready', async () => {
    console.log(`${client.user.tag} is online and ready!`);
    console.log(`🌐 Bot dashboard available at: https://your-app-name.onrender.com`); // ADD THIS
        // ADD THESE RIGHT AFTER YOUR EXISTING client.once('ready') FUNCTION
client.on('disconnect', () => {
    console.log(`🔌 Bot disconnected at: ${new Date().toISOString()}`);
});

client.on('reconnecting', () => {
    console.log(`🔄 Bot reconnecting at: ${new Date().toISOString()}`);
});

client.on('error', error => {
    console.error('❌ Discord client error:', error);
});
    
    // rest of your existing code stays the same...
});    ].map(command => command.toJSON());

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
        } else if (commandName === 'performances') {
            await handlePerformances(interaction);
        } else if (commandName === 'awards') {
            await handleAwards(interaction);
        } else if (commandName === 'power') {
            await handlePower(interaction);
        } else if (commandName === 'playoff') {
            await handlePlayoff(interaction);
        } else if (commandName === 'h2h') {
            await handleH2H(interaction);
        } else if (commandName === 'injuries') {
            await handleInjuries(interaction);
        } else if (commandName === 'targets') {
            await handleTargets(interaction);
        } else if (commandName === 'roast') {
            await handleRoast(interaction);
        } else if (commandName === 'shame') {
            await handleShame(interaction);
        } else if (commandName === 'news') {
            await handleNews(interaction);
        }
    } catch (error) {
        console.error(`Error handling ${commandName}:`, error);
        await interaction.reply({ content: 'Something went wrong! Please try again.', ephemeral: true });
    }
});

// NEW SARCASTIC FUNCTIONS

async function handleRoast(interaction) {
    await interaction.deferReply();
    
    const count = interaction.options.getInteger('count') || 2;
    const maxCount = Math.min(count, 4);
    
    try {
        const [rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Get recent matchup data
        const currentWeek = await getCurrentWeek();
        const recentWeek = Math.max(1, currentWeek - 1);
        
        let weekMatchups = [];
        try {
            const weekResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${recentWeek}`);
            weekMatchups = weekResponse.data;
        } catch (error) {
            console.log('No recent matchup data');
        }
        
        // Randomly select teams to roast
        const shuffledRosters = rosters.sort(() => 0.5 - Math.random());
        const selectedTeams = shuffledRosters.slice(0, maxCount);
        
        const embed = new EmbedBuilder()
            .setTitle('🔥 Weekly Team Roasts')
            .setDescription('*Time for some friendly fantasy football therapy*')
            .setColor(0xFF4500)
            .setTimestamp();
        
        for (let i = 0; i < selectedTeams.length; i++) {
            const roster = selectedTeams[i];
            const ownerName = userLookup[roster.owner_id] || 'Unknown';
            const record = `${roster.settings.wins}-${roster.settings.losses}`;
            const points = roster.settings.fpts.toFixed(1);
            
            // Find their recent performance
            const recentMatchup = weekMatchups.find(m => m.roster_id === roster.roster_id);
            const recentPoints = recentMatchup?.points || 0;
            
            // Generate roast based on team situation
            let roastType = 'losing';
            let extraRoast = '';
            
            if (roster.settings.wins > roster.settings.losses) {
                roastType = 'winning';
            }
            
            if (recentPoints > 0) {
                if (recentPoints > 130) {
                    extraRoast = " They finally figured out how to start their good players!";
                } else if (recentPoints < 80) {
                    extraRoast = " Last week's performance was... let's call it 'character building.'";
                }
            }
            
            // Check for bench vs starter issues (simplified)
            if (Math.random() > 0.5) {
                roastType = 'bench';
            }
            
            const randomComment = SARCASTIC_COMMENTS[roastType][Math.floor(Math.random() * SARCASTIC_COMMENTS[roastType].length)];
            const nickname = TEAM_NICKNAMES[Math.floor(Math.random() * TEAM_NICKNAMES.length)];
            
            const roastText = `**${ownerName}** (aka "${nickname}") ${randomComment}.${extraRoast}\n*Current damage: ${record} record, ${points} pts*`;
            
            embed.addFields({
                name: `🎯 Target #${i + 1}`,
                value: roastText,
                inline: false
            });
        }
        
        embed.setFooter({ text: 'All in good fun! 😄 Fantasy football builds character (and destroys friendships)' });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in roast:', error);
        await interaction.editReply('Error generating roasts. Even my trash talk is broken!');
    }
}

async function handleShame(interaction) {
    await interaction.deferReply();
    
    try {
        const currentWeek = await getCurrentWeek();
        const [rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Get recent matchup data for analysis
        let allScores = [];
        for (let week = Math.max(1, currentWeek - 3); week <= currentWeek; week++) {
            try {
                const weekResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`);
                weekResponse.data.forEach(matchup => {
                    if (matchup.points > 0) {
                        allScores.push({
                            week,
                            rosterId: matchup.roster_id,
                            points: matchup.points,
                            owner: userLookup[rosters.find(r => r.roster_id === matchup.roster_id)?.owner_id] || 'Unknown'
                        });
                    }
                });
            } catch (error) {
                console.log(`No data for week ${week}`);
            }
        }
        
        if (allScores.length === 0) {
            await interaction.editReply('No recent scores to shame... everyone is equally disappointing!');
            return;
        }
        
        // Find shameful performances
        allScores.sort((a, b) => a.points - b.points);
        const worstScore = allScores[0];
        const secondWorst = allScores[1];
        
        // Find most inconsistent (if we have enough data)
        const teamPerformances = {};
        allScores.forEach(score => {
            if (!teamPerformances[score.owner]) teamPerformances[score.owner] = [];
            teamPerformances[score.owner].push(score.points);
        });
        
        let mostInconsistent = null;
        let highestVariance = 0;
        Object.keys(teamPerformances).forEach(owner => {
            const scores = teamPerformances[owner];
            if (scores.length > 2) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
                if (variance > highestVariance) {
                    highestVariance = variance;
                    mostInconsistent = { owner, variance, scores };
                }
            }
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Hall of Shame')
            .setDescription('*Celebrating the art of fantasy football failure*')
            .setColor(0x8B0000)
            .addFields(
                {
                    name: '💀 Rock Bottom Award',
                    value: `**${worstScore.owner}** set a new low with ${worstScore.points.toFixed(1)} points in Week ${worstScore.week}.\n*That's not just losing, that's performance art.*`,
                    inline: false
                },
                {
                    name: '🤡 Runner-Up in Failure',
                    value: `**${secondWorst.owner}** with ${secondWorst.points.toFixed(1)} points in Week ${secondWorst.week}.\n*So close to being the worst, yet so far from being good.*`,
                    inline: false
                }
            );
        
        if (mostInconsistent) {
            const range = Math.max(...mostInconsistent.scores) - Math.min(...mostInconsistent.scores);
            embed.addFields({
                name: '🎢 Emotional Rollercoaster Award',
                value: `**${mostInconsistent.owner}** for their wildly inconsistent scoring.\n*Point range of ${range.toFixed(1)} - it's like they're playing fantasy roulette.*`,
                inline: false
            });
        }
        
        // Find current last place
        const sortedRosters = rosters
            .map(roster => ({
                ...roster,
                owner_name: userLookup[roster.owner_id] || 'Unknown'
            }))
            .sort((a, b) => {
                if (a.settings.wins !== b.settings.wins) {
                    return a.settings.wins - b.settings.wins;
                }
                return a.settings.fpts - b.settings.fpts;
            });
        
        const lastPlace = sortedRosters[0];
        embed.addFields({
            name: '🏮 Basement Dweller',
            value: `**${lastPlace.owner_name}** currently holding down the cellar with a ${lastPlace.settings.wins}-${lastPlace.settings.losses} record.\n*Someone has to be last, but they're really committed to the role.*`,
            inline: false
        });
        
        embed.setFooter({ text: 'Remember: It\'s not about winning or losing, it\'s about the friends we disappoint along the way.' });
        embed.setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in shame:', error);
        await interaction.editReply('Error generating shame content. Ironically shameful!');
    }
}

async function handleNews(interaction) {
    await interaction.deferReply();
    
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
        
        // Get all rostered players
        const leaguePlayerIds = new Set();
        const playerOwners = {};
        
        rosters.forEach(roster => {
            const ownerName = userLookup[roster.owner_id] || 'Unknown';
            [...(roster.starters || []), ...(roster.players || [])].forEach(playerId => {
                leaguePlayerIds.add(playerId);
                playerOwners[playerId] = ownerName;
            });
        });
        
        // Filter for relevant news - injured players, trending players, etc.
        const relevantNews = [];
        
        // Check for injury status changes
        leaguePlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (player && player.injury_status && player.injury_status !== 'Healthy') {
                relevantNews.push({
                    type: 'injury',
                    player: `${player.first_name} ${player.last_name}`,
                    team: player.team,
                    position: player.position,
                    status: player.injury_status,
                    owner: playerOwners[playerId],
                    priority: player.injury_status === 'Out' ? 3 : player.injury_status === 'Doubtful' ? 2 : 1
                });
            }
        });
        
        // Try to get trending players that might affect league
        try {
            const trendingResponse = await axios.get(`${SLEEPER_API}/players/nfl/trending/add?lookback_hours=24&limit=10`);
            trendingResponse.data.forEach(trending => {
                const player = players[trending.player_id];
                if (player && trending.count > 50) { // Significant trending
                    relevantNews.push({
                        type: 'trending',
                        player: `${player.first_name} ${player.last_name}`,
                        team: player.team,
                        position: player.position,
                        count: trending.count,
                        priority: 1
                    });
                }
            });
        } catch (error) {
            console.log('No trending data available');
        }
        
        // Sort by priority
        relevantNews.sort((a, b) => b.priority - a.priority);
        
        const embed = new EmbedBuilder()
            .setTitle('📰 League News & Updates')
            .setDescription('*Latest developments affecting your fantasy teams*')
            .setColor(0x1E90FF)
            .setTimestamp();
        
        if (relevantNews.length === 0) {
            embed.addFields({
                name: '😴 All Quiet on the Fantasy Front',
                value: 'No major news affecting league players today. Either everyone is healthy or we\'re all doomed.',
                inline: false
            });
        } else {
            // Group news by type
            const injuries = relevantNews.filter(news => news.type === 'injury');
            const trending = relevantNews.filter(news => news.type === 'trending');
            
            if (injuries.length > 0) {
                let injuryText = '';
                injuries.slice(0, 8).forEach(news => {
                    const emoji = news.status === 'Out' ? '🚫' : news.status === 'Doubtful' ? '⚠️' : '❓';
                    injuryText += `${emoji} **${news.player}** (${news.position}, ${news.team}) - ${news.status}\n`;
                    injuryText += `*Owned by ${news.owner}*\n\n`;
                });
                
                embed.addFields({
                    name: '🏥 Injury Report',
                    value: injuryText,
                    inline: false
                });
            }
            
            if (trending.length > 0) {
                let trendingText = '';
                trending.slice(0, 5).forEach(news => {
                    trendingText += `📈 **${news.player}** (${news.position}, ${news.team})\n`;
                    trendingText += `*${news.count} adds in 24hrs - Available in your league*\n\n`;
                });
                
                embed.addFields({
                    name: '🔥 Trending Players',
                    value: trendingText,
                    inline: false
                });
            }
        }
        
        embed.setFooter({ text: 'Stay informed, stay competitive! 📊' });
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in news:', error);
        await interaction.editReply('Error getting league news. Even my news gathering is having a rough day!');
    }
}

// Enhanced existing functions with more personality
async function getCurrentWeek() {
    try {
        const response = await axios.get(`${SLEEPER_API}/state/nfl`);
        return response.data.week;
    } catch (error) {
        console.error('Error getting current week:', error);
        return 1;
    }
}

// [Include all your existing handler functions here - handleStandings, handleMatchup, etc.]
// I'll show the enhanced versions of a couple key ones:

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
            .setTitle(`${league.name} - Current Standings`)
            .setDescription('*The beautiful chaos of fantasy football rankings*')
            .setColor(0x0099FF)
            .setTimestamp();
        
        let standingsText = '';
        sortedRosters.forEach((roster, index) => {
            const wins = roster.settings.wins;
            const losses = roster.settings.losses;
            const points = roster.settings.fpts.toFixed(1);
            
            // Add some personality to standings
            let emoji = '';
            if (index === 0) emoji = '👑';
            else if (index === 1) emoji = '🥈';
            else if (index === 2) emoji = '🥉';
            else if (index === sortedRosters.length - 1) emoji = '💀';
            else if (index === sortedRosters.length - 2) emoji = '⚰️';
            
            standingsText += `${emoji} **${index + 1}.** ${roster.owner_name}\n`;
            standingsText += `${wins}-${losses} • ${points} pts\n\n`;
        });
        
        embed.setDescription(standingsText);
        embed.setFooter({ text: 'Remember: It\'s not where you are, it\'s where you\'re going... hopefully up!' });
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in standings:', error);
        await interaction.editReply('Error getting standings. Even the leaderboard is embarrassed!');
    }
}

// DAILY NEWS AUTOMATION
cron.schedule('0 9 * * *', async () => {
    try {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (!channel) return;
        
        // Run the news function automatically
        const newsEmbed = await generateDailyNews();
        if (newsEmbed) {
            await channel.send({ embeds: [newsEmbed] });
            console.log('Sent daily news update');
        }
    } catch (error) {
        console.error('Error sending daily news:', error);
    }
});

// WEEKLY SARCASTIC TEAM WRITE-UPS
cron.schedule('0 10 * * 2', async () => {
    try {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (!channel) return;
        
        const currentWeek = await getCurrentWeek();
        
        // Generate sarcastic weekly preview
        const roastEmbed = await generateWeeklyRoasts();
        if (roastEmbed) {
            await channel.send({ 
                content: `🔥 **Week ${currentWeek} Team Check-In** 🔥\n*Time for your weekly dose of fantasy reality!*`,
                embeds: [roastEmbed] 
            });
            console.log(`Sent weekly team roasts for week ${currentWeek}`);
        }
    } catch (error) {
        console.error('Error sending weekly roasts:', error);
    }
});

async function generateDailyNews() {
    try {
        // Similar to handleNews but returns embed instead of responding
        const [rostersResponse, usersResponse, playersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`),
            axios.get(`${SLEEPER_API}/players/nfl`)
        ]);
        
        // [Implementation similar to handleNews but condensed for daily updates]
        // Return embed or null if no significant news
        
        return null; // Placeholder - implement based on your needs
    } catch (error) {
        console.error('Error generating daily news:', error);
        return null;
    }
}

async function generateWeeklyRoasts() {
    try {
        // Similar to handleRoast but automated
        // Return embed with 3-4 random team roasts
        
        return null; // Placeholder - implement based on your needs  
    } catch (error) {
        console.error('Error generating weekly roasts:', error);
        return null;
    }
}

// Keep all your existing cron jobs
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

// Add all your existing handler functions here
// I'm including the key ones with enhanced sarcastic elements:

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
            .setTitle(`${league.name} - Current Standings`)
            .setDescription('*The beautiful chaos of fantasy football rankings*')
            .setColor(0x0099FF)
            .setTimestamp();
        
        let standingsText = '';
        sortedRosters.forEach((roster, index) => {
            const wins = roster.settings.wins;
            const losses = roster.settings.losses;
            const points = roster.settings.fpts.toFixed(1);
            
            // Add some personality to standings
            let emoji = '';
            if (index === 0) emoji = '👑';
            else if (index === 1) emoji = '🥈';
            else if (index === 2) emoji = '🥉';
            else if (index === sortedRosters.length - 1) emoji = '💀';
            else if (index === sortedRosters.length - 2) emoji = '⚰️';
            
            standingsText += `${emoji} **${index + 1}.** ${roster.owner_name}\n`;
            standingsText += `${wins}-${losses} • ${points} pts\n\n`;
        });
        
        embed.setDescription(standingsText);
        embed.setFooter({ text: 'Remember: It\'s not where you are, it\'s where you\'re going... hopefully up!' });
        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in standings:', error);
        await interaction.editReply('Error getting standings. Even the leaderboard is embarrassed!');
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

async function handlePerformances(interaction) {
    await interaction.deferReply();
    
    const week = interaction.options.getInteger('week') || await getCurrentWeek();
    
    try {
        const [matchupsResponse, rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const matchups = matchupsResponse.data;
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        const rosterLookup = {};
        rosters.forEach(roster => {
            rosterLookup[roster.roster_id] = userLookup[roster.owner_id] || 'Unknown';
        });
        
        const performances = matchups.map(matchup => ({
            team: rosterLookup[matchup.roster_id],
            points: matchup.points || 0,
            roster_id: matchup.roster_id
        })).filter(p => p.points > 0);
        
        if (performances.length === 0) {
            await interaction.editReply(`No scoring data found for week ${week}!`);
            return;
        }
        
        performances.sort((a, b) => b.points - a.points);
        
        const best = performances[0];
        const worst = performances[performances.length - 1];
        const average = performances.reduce((sum, p) => sum + p.points, 0) / performances.length;
        
        const embed = new EmbedBuilder()
            .setTitle(`📊 Week ${week} Performances`)
            .setColor(0x9932CC)
            .addFields(
                {
                    name: '🏆 Best Performance',
                    value: `**${best.team}**\n${best.points.toFixed(1)} points`,
                    inline: true
                },
                {
                    name: '💀 Worst Performance', 
                    value: `**${worst.team}**\n${worst.points.toFixed(1)} points`,
                    inline: true
                },
                {
                    name: '📈 League Average',
                    value: `${average.toFixed(1)} points`,
                    inline: true
                }
            )
            .setTimestamp();
        
        if (performances.length >= 6) {
            const top3 = performances.slice(0, 3);
            const bottom3 = performances.slice(-3).reverse();
            
            embed.addFields(
                {
                    name: '🥇 Top 3 Scores',
                    value: top3.map((p, i) => 
                        `${i + 1}. ${p.team} - ${p.points.toFixed(1)}`
                    ).join('\n'),
                    inline: true
                },
                {
                    name: '📉 Bottom 3 Scores',
                    value: bottom3.map((p, i) => 
                        `${performances.length - i}. ${p.team} - ${p.points.toFixed(1)}`
                    ).join('\n'),
                    inline: true
                }
            );
        }
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in performances:', error);
        await interaction.editReply(`Error getting performances for week ${week}. Please try again!`);
    }
}

async function handleAwards(interaction) {
    await interaction.deferReply();
    
    try {
        const currentWeek = await getCurrentWeek();
        const [rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Get all weeks of data
        const allWeeksData = [];
        for (let week = 1; week <= currentWeek; week++) {
            try {
                const weekResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`);
                allWeeksData.push({ week, matchups: weekResponse.data });
            } catch (error) {
                console.log(`No data for week ${week}`);
            }
        }
        
        // Calculate season awards
        let highestScore = { points: 0, team: '', week: 0 };
        let lowestScore = { points: 999, team: '', week: 0 };
        const teamScores = {};
        
        allWeeksData.forEach(({ week, matchups }) => {
            matchups.forEach(matchup => {
                if (matchup.points && matchup.points > 0) {
                    const teamName = userLookup[rosters.find(r => r.roster_id === matchup.roster_id)?.owner_id] || 'Unknown';
                    
                    if (!teamScores[teamName]) teamScores[teamName] = [];
                    teamScores[teamName].push(matchup.points);
                    
                    if (matchup.points > highestScore.points) {
                        highestScore = { points: matchup.points, team: teamName, week };
                    }
                    if (matchup.points < lowestScore.points) {
                        lowestScore = { points: matchup.points, team: teamName, week };
                    }
                }
            });
        });
        
        // Most consistent team (lowest standard deviation)
        let mostConsistent = { team: '', stdDev: 999 };
        Object.keys(teamScores).forEach(team => {
            const scores = teamScores[team];
            if (scores.length > 1) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
                const stdDev = Math.sqrt(variance);
                
                if (stdDev < mostConsistent.stdDev) {
                    mostConsistent = { team, stdDev, avg };
                }
            }
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Season Awards & Achievements')
            .setColor(0xFFD700)
            .addFields(
                {
                    name: '🔥 Highest Single Week',
                    value: `**${highestScore.team}**\n${highestScore.points.toFixed(1)} pts (Week ${highestScore.week})`,
                    inline: true
                },
                {
                    name: '💀 Lowest Single Week',
                    value: `**${lowestScore.team}**\n${lowestScore.points.toFixed(1)} pts (Week ${lowestScore.week})`,
                    inline: true
                },
                {
                    name: '📊 Most Consistent',
                    value: `**${mostConsistent.team}**\nAvg: ${mostConsistent.avg?.toFixed(1) || 'N/A'} pts`,
                    inline: true
                }
            );
        
        // Add current standings leaders
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
        
        const leader = sortedRosters[0];
        const pointsLeader = [...sortedRosters].sort((a, b) => b.settings.fpts - a.settings.fpts)[0];
        
        embed.addFields(
            {
                name: '👑 Current Leader',
                value: `**${leader.owner_name}**\n${leader.settings.wins}-${leader.settings.losses}`,
                inline: true
            },
            {
                name: '🎯 Points Leader', 
                value: `**${pointsLeader.owner_name}**\n${pointsLeader.settings.fpts.toFixed(1)} pts`,
                inline: true
            }
        );
        
        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in awards:', error);
        await interaction.editReply('Error getting season awards. Please try again!');
    }
}

async function handlePower(interaction) {
    await interaction.deferReply();
    
    const weeksToAnalyze = interaction.options.getInteger('weeks') || 3;
    
    try {
        const currentWeek = await getCurrentWeek();
        const [rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Get recent weeks data
        const teamRecent = {};
        const startWeek = Math.max(1, currentWeek - weeksToAnalyze + 1);
        
        for (let week = startWeek; week <= currentWeek; week++) {
            try {
                const weekResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`);
                weekResponse.data.forEach(matchup => {
                    if (matchup.points && matchup.points > 0) {
                        const teamName = userLookup[rosters.find(r => r.roster_id === matchup.roster_id)?.owner_id] || 'Unknown';
                        if (!teamRecent[teamName]) teamRecent[teamName] = [];
                        teamRecent[teamName].push(matchup.points);
                    }
                });
            } catch (error) {
                console.log(`No data for week ${week}`);
            }
        }
        
        // Calculate power rankings
        const powerRankings = Object.keys(teamRecent).map(team => {
            const recentScores = teamRecent[team];
            const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
            const roster = rosters.find(r => userLookup[r.owner_id] === team);
            const record = roster ? `${roster.settings.wins}-${roster.settings.losses}` : '0-0';
            
            return {
                team,
                recentAvg,
                record,
                recentGames: recentScores.length
            };
        }).sort((a, b) => b.recentAvg - a.recentAvg);
        
        const embed = new EmbedBuilder()
            .setTitle(`⚡ Power Rankings (Last ${weeksToAnalyze} weeks)`)
            .setColor(0xFF4500)
            .setTimestamp();
        
        let rankingText = '';
        powerRankings.forEach((team, index) => {
            const trend = index < powerRankings.length / 2 ? '📈' : '📉';
            rankingText += `**${index + 1}.** ${team.team} ${trend}\n`;
            rankingText += `${team.recentAvg.toFixed(1)} avg • ${team.record} record\n\n`;
        });
        
        embed.setDescription(rankingText);
        embed.setFooter({ text: `Based on average points over ${weeksToAnalyze} weeks` });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in power rankings:', error);
        await interaction.editReply('Error getting power rankings. Please try again!');
    }
}

async function handlePlayoff(interaction) {
    await interaction.deferReply();
    
    try {
        const [leagueResponse, rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const league = leagueResponse.data;
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Sort by playoff standings
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
        
        const playoffSpots = league.settings?.playoff_teams || 6;
        const totalTeams = sortedRosters.length;
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 Playoff Picture')
            .setColor(0x32CD32)
            .setTimestamp();
        
        let playoffText = '**🎯 In Playoff Position:**\n';
        sortedRosters.slice(0, playoffSpots).forEach((team, index) => {
            const seed = index + 1;
            playoffText += `${seed}. ${team.owner_name} (${team.settings.wins}-${team.settings.losses})\n`;
        });
        
        playoffText += '\n**❌ Outside Playoffs:**\n';
        sortedRosters.slice(playoffSpots).forEach((team, index) => {
            const position = playoffSpots + index + 1;
            playoffText += `${position}. ${team.owner_name} (${team.settings.wins}-${team.settings.losses})\n`;
        });
        
        embed.setDescription(playoffText);
        embed.addFields({
            name: '📊 Playoff Info',
            value: `${playoffSpots} teams make playoffs\n${totalTeams - playoffSpots} teams eliminated`,
            inline: false
        });
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in playoff picture:', error);
        await interaction.editReply('Error getting playoff picture. Please try again!');
    }
}

async function handleH2H(interaction) {
    await interaction.deferReply();
    
    const team1Name = interaction.options.getString('team1');
    const team2Name = interaction.options.getString('team2');
    
    try {
        const [rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Find the teams
        const team1 = rosters.find(roster => {
            const ownerName = userLookup[roster.owner_id]?.toLowerCase() || '';
            return ownerName.includes(team1Name.toLowerCase());
        });
        
        const team2 = rosters.find(roster => {
            const ownerName = userLookup[roster.owner_id]?.toLowerCase() || '';
            return ownerName.includes(team2Name.toLowerCase());
        });
        
        if (!team1 || !team2) {
            await interaction.editReply('One or both teams not found! Try using part of the team owner\'s name.');
            return;
        }
        
        const team1Owner = userLookup[team1.owner_id];
        const team2Owner = userLookup[team2.owner_id];
        
        // Get all matchup data to find head-to-head
        const currentWeek = await getCurrentWeek();
        let h2hWins1 = 0, h2hWins2 = 0;
        const h2hGames = [];
        
        for (let week = 1; week <= currentWeek; week++) {
            try {
                const weekResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${week}`);
                const weekMatchups = weekResponse.data;
                
                const team1Matchup = weekMatchups.find(m => m.roster_id === team1.roster_id);
                const team2Matchup = weekMatchups.find(m => m.roster_id === team2.roster_id);
                
                if (team1Matchup && team2Matchup && team1Matchup.matchup_id === team2Matchup.matchup_id) {
                    // They played each other this week
                    const team1Points = team1Matchup.points || 0;
                    const team2Points = team2Matchup.points || 0;
                    
                    h2hGames.push({
                        week,
                        team1Points,
                        team2Points,
                        winner: team1Points > team2Points ? team1Owner : team2Owner
                    });
                    
                    if (team1Points > team2Points) h2hWins1++;
                    else if (team2Points > team1Points) h2hWins2++;
                }
            } catch (error) {
                console.log(`No data for week ${week}`);
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`⚔️ Head-to-Head: ${team1Owner} vs ${team2Owner}`)
            .setColor(0x8B008B)
            .addFields(
                {
                    name: `${team1Owner} Record`,
                    value: `${team1.settings.wins}-${team1.settings.losses}\n${team1.settings.fpts.toFixed(1)} pts`,
                    inline: true
                },
                {
                    name: `${team2Owner} Record`,
                    value: `${team2.settings.wins}-${team2.settings.losses}\n${team2.settings.fpts.toFixed(1)} pts`,
                    inline: true
                },
                {
                    name: 'H2H Record',
                    value: `${team1Owner}: ${h2hWins1}\n${team2Owner}: ${h2hWins2}`,
                    inline: true
                }
            );
        
        if (h2hGames.length > 0) {
            let gameResults = '';
            h2hGames.forEach(game => {
                gameResults += `Week ${game.week}: ${game.team1Points.toFixed(1)} - ${game.team2Points.toFixed(1)} (${game.winner})\n`;
            });
            embed.addFields({
                name: '🏈 Recent Matchups',
                value: gameResults || 'No recent matchups',
                inline: false
            });
        } else {
            embed.addFields({
                name: '🏈 Matchup History',
                value: 'These teams haven\'t played each other yet this season!',
                inline: false
            });
        }
        
        embed.setTimestamp();
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in H2H:', error);
        await interaction.editReply('Error getting head-to-head data. Please try again!');
    }
}

async function handleInjuries(interaction) {
    await interaction.deferReply();
    
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
        
        const injuredPlayers = [];
        
        rosters.forEach(roster => {
            const ownerName = userLookup[roster.owner_id] || 'Unknown';
            const allPlayers = [...(roster.starters || []), ...(roster.players || [])];
            
            allPlayers.forEach(playerId => {
                const player = players[playerId];
                if (player && player.injury_status && player.injury_status !== 'Healthy') {
                    injuredPlayers.push({
                        name: `${player.first_name} ${player.last_name}`,
                        position: player.position,
                        team: player.team,
                        injury: player.injury_status,
                        owner: ownerName
                    });
                }
            });
        });
        
        const embed = new EmbedBuilder()
            .setTitle('🏥 League Injury Report')
            .setColor(0xFF6347)
            .setTimestamp();
        
        if (injuredPlayers.length === 0) {
            embed.setDescription('🎉 No injured players found on any rosters!');
        } else {
            // Group by injury status
            const byStatus = {};
            injuredPlayers.forEach(player => {
                if (!byStatus[player.injury]) byStatus[player.injury] = [];
                byStatus[player.injury].push(player);
            });
            
            Object.keys(byStatus).forEach(status => {
                const statusEmoji = {
                    'Questionable': '❓',
                    'Doubtful': '❌', 
                    'Out': '🚫',
                    'IR': '🏥',
                    'Injured Reserve': '🏥'
                }[status] || '⚠️';
                
                const playerList = byStatus[status].map(p => 
                    `${p.name} (${p.position}, ${p.team}) - ${p.owner}`
                ).join('\n');
                
                embed.addFields({
                    name: `${statusEmoji} ${status}`,
                    value: playerList,
                    inline: false
                });
            });
            
            embed.setFooter({ text: `${injuredPlayers.length} injured players total` });
        }
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in injuries:', error);
        await interaction.editReply('Error getting injury report. Please try again!');
    }
}

async function handleTargets(interaction) {
    await interaction.deferReply();
    
    try {
        // Get trending players from Sleeper
        const [trendingAddsResponse, playersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/players/nfl/trending/add?lookback_hours=24&limit=15`),
            axios.get(`${SLEEPER_API}/players/nfl`)
        ]);
        
        const trendingAdds = trendingAddsResponse.data;
        const players = playersResponse.data;
        
        // Get league rosters to see who's available
        const rostersResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`);
        const rosters = rostersResponse.data;
        
        // Get all rostered players
        const rosteredPlayers = new Set();
        rosters.forEach(roster => {
            [...(roster.starters || []), ...(roster.players || [])].forEach(playerId => {
                rosteredPlayers.add(playerId);
            });
        });
        
        // Filter trending players to only show available ones
        const availableTargets = trendingAdds.filter(trending => {
            return !rosteredPlayers.has(trending.player_id);
        }).slice(0, 10);
        
        const embed = new EmbedBuilder()
            .setTitle('🎯 Hot Waiver Wire Targets')
            .setColor(0x00CED1)
            .setTimestamp();
        
        if (availableTargets.length === 0) {
            embed.setDescription('No trending available players found. All hot targets are already rostered!');
        } else {
            let targetText = '';
            availableTargets.forEach((trending, index) => {
                const player = players[trending.player_id];
                if (player) {
                    const adds = trending.count;
                    targetText += `**${index + 1}. ${player.first_name} ${player.last_name}** (${player.position})\n`;
                    targetText += `${player.team} • ${adds} adds in 24hrs\n\n`;
                }
            });
            
            embed.setDescription(targetText);
            embed.addFields({
                name: '💡 Pro Tip',
                value: 'These players are trending up league-wide. Consider adding them before your opponents do!',
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Data from Sleeper trending adds (last 24 hours)' });
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error in targets:', error);
        await interaction.editReply('Error getting waiver targets. Please try again!');
    }
}

// Enhanced helper functions for automated content
async function generateDailyNews() {
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
        
        // Get all rostered players with their owners
        const playerOwners = {};
        const leaguePlayerIds = new Set();
        
        rosters.forEach(roster => {
            const ownerName = userLookup[roster.owner_id] || 'Unknown';
            [...(roster.starters || []), ...(roster.players || [])].forEach(playerId => {
                leaguePlayerIds.add(playerId);
                playerOwners[playerId] = ownerName;
            });
        });
        
        // Find significant news
        const newsItems = [];
        
        // Check for new injuries
        leaguePlayerIds.forEach(playerId => {
            const player = players[playerId];
            if (player && player.injury_status && player.injury_status !== 'Healthy') {
                newsItems.push({
                    type: 'injury',
                    player: `${player.first_name} ${player.last_name}`,
                    team: player.team,
                    position: player.position,
                    status: player.injury_status,
                    owner: playerOwners[playerId],
                    importance: player.injury_status === 'Out' ? 3 : 2
                });
            }
        });
        
        // Get trending adds that might be relevant
        try {
            const trendingResponse = await axios.get(`${SLEEPER_API}/players/nfl/trending/add?lookback_hours=24&limit=8`);
            trendingResponse.data.forEach(trending => {
                const player = players[trending.player_id];
                if (player && trending.count > 100) {
                    newsItems.push({
                        type: 'trending',
                        player: `${player.first_name} ${player.last_name}`,
                        team: player.team,
                        position: player.position,
                        count: trending.count,
                        importance: 1
                    });
                }
            });
        } catch (error) {
            console.log('No trending data available');
        }
        
        // Only create news if there are significant items
        if (newsItems.length === 0) return null;
        
        const embed = new EmbedBuilder()
            .setTitle('📰 Daily Fantasy News')
            .setColor(0x1E90FF)
            .setTimestamp();
        
        const importantItems = newsItems.filter(item => item.importance >= 2);
        const trendingItems = newsItems.filter(item => item.type === 'trending');
        
        if (importantItems.length > 0) {
            let newsText = '';
            importantItems.slice(0, 5).forEach(item => {
                if (item.type === 'injury') {
                    const emoji = item.status === 'Out' ? '🚨' : '⚠️';
                    newsText += `${emoji} **${item.player}** (${item.position}, ${item.team}) - ${item.status}\n`;
                    newsText += `*${item.owner}'s roster affected*\n\n`;
                }
            });
            
            if (newsText) {
                embed.addFields({
                    name: '🏥 Injury Updates',
                    value: newsText,
                    inline: false
                });
            }
        }
        
        if (trendingItems.length > 0) {
            let trendingText = '';
            trendingItems.slice(0, 3).forEach(item => {
                trendingText += `📈 **${item.player}** (${item.position}, ${item.team})\n`;
                trendingText += `*${item.count} league adds - Check availability!*\n\n`;
            });
            
            embed.addFields({
                name: '🔥 Hot Pickups',
                value: trendingText,
                inline: false
            });
        }
        
        embed.setFooter({ text: 'Stay ahead of your league! 🏆' });
        return embed;
        
    } catch (error) {
        console.error('Error generating daily news:', error);
        return null;
    }
}

async function generateWeeklyRoasts() {
    try {
        const [rostersResponse, usersResponse] = await Promise.all([
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/rosters`),
            axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/users`)
        ]);
        
        const rosters = rostersResponse.data;
        const users = usersResponse.data;
        
        const userLookup = {};
        users.forEach(user => {
            userLookup[user.user_id] = user.display_name || user.username;
        });
        
        // Get recent performance data
        const currentWeek = await getCurrentWeek();
        const lastWeek = Math.max(1, currentWeek - 1);
        
        let lastWeekScores = [];
        try {
            const weekResponse = await axios.get(`${SLEEPER_API}/league/${SLEEPER_LEAGUE_ID}/matchups/${lastWeek}`);
            lastWeekScores = weekResponse.data;
        } catch (error) {
            console.log('No recent scores available');
        }
        
        // Select 3 random teams for roasting
        const shuffledRosters = [...rosters].sort(() => 0.5 - Math.random());
        const selectedTeams = shuffledRosters.slice(0, 3);
        
        const embed = new EmbedBuilder()
            .setTitle('🔥 Weekly Reality Check')
            .setDescription('*Your friendly neighborhood fantasy therapist is back with some hard truths*')
            .setColor(0xFF4500)
            .setTimestamp();
        
        selectedTeams.forEach((roster, index) => {
            const ownerName = userLookup[roster.owner_id] || 'Unknown';
            const record = `${roster.settings.wins}-${roster.settings.losses}`;
            const totalPoints = roster.settings.fpts.toFixed(1);
            
            // Find their last week performance
            const lastWeekPerformance = lastWeekScores.find(score => score.roster_id === roster.roster_id);
            const lastWeekPoints = lastWeekPerformance?.points || 0;
            
            // Determine roast style based on performance
            let roastCategory = 'losing';
            if (roster.settings.wins > roster.settings.losses) {
                roastCategory = 'winning';
            }
            
            // Special cases for extreme performances
            if (lastWeekPoints > 0) {
                if (lastWeekPoints > 140) roastCategory = 'winning';
                else if (lastWeekPoints < 80) roastCategory = 'losing';
            }
            
            // Add some randomness to roast selection
            const categories = ['losing', 'bench', 'waivers'];
            if (Math.random() > 0.7) {
                roastCategory = categories[Math.floor(Math.random() * categories.length)];
            }
            
            const roastComment = SARCASTIC_COMMENTS[roastCategory][Math.floor(Math.random() * SARCASTIC_COMMENTS[roastCategory].length)];
            const nickname = TEAM_NICKNAMES[Math.floor(Math.random() * TEAM_NICKNAMES.length)];
            
            let extraComment = '';
            if (lastWeekPoints > 0) {
                if (lastWeekPoints > 130) {
                    extraComment = ' Finally had a week where everything went right!';
                } else if (lastWeekPoints < 70) {
                    extraComment = ' Last week was... well, we\'ll call it a learning experience.';
                }
            }
            
            const roastText = `**${ownerName}** (${record}) ${roastComment}.${extraComment}\n*Season damage: ${totalPoints} total points*`;
            
            const emojis = ['🎯', '🔥', '💀'];
            embed.addFields({
                name: `${emojis[index]} ${nickname}`,
                value: roastText,
                inline: false
            });
        });
        
        embed.setFooter({ text: 'Fantasy football: where dreams go to die and friendships are tested! 😈' });
        return embed;
        
    } catch (error) {
        console.error('Error generating weekly roasts:', error);
        return null;
    }
}

// Daily news cron job
cron.schedule('0 9 * * *', async () => {
    try {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (!channel) return;
        
        const newsEmbed = await generateDailyNews();
        if (newsEmbed) {
            await channel.send({ 
                content: '☕ **Good morning, fantasy managers!**\nHere\'s what you need to know today:',
                embeds: [newsEmbed] 
            });
            console.log('Sent daily news update');
        }
    } catch (error) {
        console.error('Error sending daily news:', error);
    }
});

// Weekly roast cron job (Tuesdays at 10 AM)
cron.schedule('0 10 * * 2', async () => {
    try {
        const channel = client.channels.cache.get(DISCORD_CHANNEL_ID);
        if (!channel) return;
        
        const currentWeek = await getCurrentWeek();
        const roastEmbed = await generateWeeklyRoasts();
        
        if (roastEmbed) {
            await channel.send({ 
                content: `🎪 **Week ${currentWeek} Team Therapy Session** 🎪\n*Time for some friendly fantasy football intervention!*`,
                embeds: [roastEmbed] 
            });
            console.log(`Sent weekly team roasts for week ${currentWeek}`);
        }
        
        // Also send the regular week preview
        const embed = new EmbedBuilder()
            .setTitle(`🏈 Week ${currentWeek} Preview`)
            .setDescription('New week is here! Use `/matchup` to see all matchups!')
            .setColor(0x00FF00)
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        console.log(`Sent week ${currentWeek} preview`);
        
    } catch (error) {
        console.error('Error sending weekly content:', error);
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
