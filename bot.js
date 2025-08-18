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
            .setDescription('Hot waiver wire targets and trending players')
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
