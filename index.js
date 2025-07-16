const { Client, GatewayIntentBits, Collection, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ActivityType } = require('discord.js');
const OpenAI = require('openai');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration
    ]
});

// Préfixe du bot
const PREFIX = ')';

// Configuration OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // Vous devrez ajouter votre clé API dans les secrets
});

// Stockage des données temporaires
const warnings = new Map();
const notes = new Map();
const serverSettings = new Map();
const reminders = new Map();

client.once('ready', async () => {
    console.log(`Bot connecté en tant que ${client.user.tag}!`);

    // Définir l'activité du bot
    client.user.setActivity('Owner Kzr 🦸‍♀️', { type: ActivityType.Watching });

    console.log(`Bot prêt! Préfixe: ${PREFIX}`);
});

// Fonction pour parser la durée
function parseDuration(duration) {
    const regex = /(\d+)([smhd])/i;
    const match = duration.match(regex);

    if (!match) return null;

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
        case 's': return amount * 1000;
        case 'm': return amount * 60 * 1000;
        case 'h': return amount * 60 * 60 * 1000;
        case 'd': return amount * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

client.on('messageCreate', async message => {
    // Ignorer les messages des bots
    if (message.author.bot) return;

    // Vérifier si le bot est pingé
    if (message.mentions.has(client.user)) {
        try {
            // Indicateur de frappe
            await message.channel.sendTyping();

            // Obtenir le message de l'utilisateur sans le ping
            const userMessage = message.content.replace(`<@${client.user.id}>`, '').trim();
            
            // Si pas de message spécifique, utiliser un message par défaut
            const prompt = userMessage || "Salue-moi de manière amicale et présente-toi comme un bot Discord utile.";

            // Appel à l'API OpenAI
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: `Tu es un assistant IA intégré dans un bot Discord créé par Owner Kzr 🦸‍♀️. Tu es amical, utile et tu parles français. Tu peux aider avec diverses questions et tu as des commandes Discord disponibles avec le préfixe "${PREFIX}". Garde tes réponses courtes et engageantes. Utilise des emojis de manière modérée.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 200,
                temperature: 0.7
            });

            const aiResponse = completion.choices[0].message.content;

            const aiEmbed = new EmbedBuilder()
                .setTitle('🤖 Assistant IA Powered by OpenAI')
                .setDescription(aiResponse)
                .addFields(
                    { name: '💡 Astuce', value: `Utilise \`${PREFIX}help\` pour voir toutes mes commandes !` },
                    { name: '🎮 Préfixe', value: `Mon préfixe est : **${PREFIX}**` }
                )
                .setColor(0x00ff88)
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: 'Propulsé par OpenAI GPT-3.5' });

            await message.reply({ embeds: [aiEmbed] });

        } catch (error) {
            console.error('Erreur OpenAI:', error);
            
            // Réponse de fallback en cas d'erreur
            const fallbackEmbed = new EmbedBuilder()
                .setTitle('🤖 Assistant IA')
                .setDescription('Salut ! Je suis ton assistant IA, mais j\'ai un petit problème technique en ce moment. 😅\nTu peux toujours utiliser mes commandes normalement !')
                .addFields(
                    { name: '💡 Astuce', value: `Utilise \`${PREFIX}help\` pour voir toutes mes commandes !` },
                    { name: '🎮 Préfixe', value: `Mon préfixe est : **${PREFIX}**` }
                )
                .setColor(0xff6b6b)
                .setThumbnail(client.user.displayAvatarURL())
                .setTimestamp();

            await message.reply({ embeds: [fallbackEmbed] });
        }
        return;
    }

    // Vérifier si le message commence par le préfixe
    if (!message.content.startsWith(PREFIX)) return;

    // Extraire la commande et les arguments
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        switch (command) {
            case '8ball':
                if (!args.length) {
                    await message.reply('❌ Veuillez poser une question!');
                    return;
                }
                const responses = [
                    'Oui', 'Non', 'Peut-être', 'Certainement', 'Jamais',
                    'C\'est probable', 'C\'est improbable', 'Sans aucun doute',
                    'Je ne peux pas le dire maintenant', 'Demande encore plus tard'
                ];
                const response = responses[Math.floor(Math.random() * responses.length)];
                await message.reply(`🎱 ${response}`);
                break;

            case 'coinflip':
            case 'conflip':
                const coinResult = Math.random() < 0.5 ? 'Pile' : 'Face';
                await message.reply(`🪙 ${coinResult}!`);
                break;

            case 'roll':
                const sides = parseInt(args[0]) || 6;
                const roll = Math.floor(Math.random() * sides) + 1;
                await message.reply(`🎲 Vous avez obtenu: ${roll}/${sides}`);
                break;

            case 'rps':
                if (!args.length) {
                    await message.reply('❌ Choisissez: pierre, feuille ou ciseaux');
                    return;
                }
                const userChoice = args[0].toLowerCase();
                const validChoices = ['pierre', 'feuille', 'ciseaux', 'rock', 'paper', 'scissors'];

                if (!validChoices.includes(userChoice)) {
                    await message.reply('❌ Choix invalide! Utilisez: pierre, feuille ou ciseaux');
                    return;
                }

                const choices = ['pierre', 'feuille', 'ciseaux'];
                const botChoice = choices[Math.floor(Math.random() * choices.length)];
                const choiceEmojis = { pierre: '🪨', feuille: '📄', ciseaux: '✂️' };

                let rpsResult;
                const normalizedUser = userChoice === 'rock' ? 'pierre' : userChoice === 'paper' ? 'feuille' : userChoice === 'scissors' ? 'ciseaux' : userChoice;

                if (normalizedUser === botChoice) {
                    rpsResult = 'Égalité!';
                } else if (
                    (normalizedUser === 'pierre' && botChoice === 'ciseaux') ||
                    (normalizedUser === 'feuille' && botChoice === 'pierre') ||
                    (normalizedUser === 'ciseaux' && botChoice === 'feuille')
                ) {
                    rpsResult = 'Vous gagnez!';
                } else {
                    rpsResult = 'Vous perdez!';
                }

                await message.reply(`${choiceEmojis[normalizedUser]} vs ${choiceEmojis[botChoice]}\n${normalizedUser} vs ${botChoice}\n**${rpsResult}**`);
                break;

            case 'guess':
                const userGuess = parseInt(args[0]);
                if (isNaN(userGuess) || userGuess < 1 || userGuess > 100) {
                    await message.reply('❌ Veuillez entrer un nombre entre 1 et 100!');
                    return;
                }
                const secretNumber = Math.floor(Math.random() * 100) + 1;

                if (userGuess === secretNumber) {
                    await message.reply(`🎉 Bravo! Vous avez deviné le nombre ${secretNumber}!`);
                } else {
                    await message.reply(`❌ Raté! Le nombre était ${secretNumber}. Vous aviez deviné ${userGuess}.`);
                }
                break;

            case 'avatar':
                const avatarUser = message.mentions.users.first() || message.author;
                const embed = new EmbedBuilder()
                    .setTitle(`Avatar de ${avatarUser.tag}`)
                    .setImage(avatarUser.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setColor(0x00AE86);
                await message.reply({ embeds: [embed] });
                break;

            case 'server':
                const serverEmbed = new EmbedBuilder()
                    .setTitle(message.guild.name)
                    .setThumbnail(message.guild.iconURL())
                    .addFields(
                        { name: 'Membres', value: message.guild.memberCount.toString(), inline: true },
                        { name: 'Créé le', value: message.guild.createdAt.toDateString(), inline: true },
                        { name: 'Propriétaire', value: `<@${message.guild.ownerId}>`, inline: true },
                        { name: 'Région', value: message.guild.preferredLocale || 'Inconnue', inline: true },
                        { name: 'Niveau de vérification', value: message.guild.verificationLevel.toString(), inline: true },
                        { name: 'Salons', value: message.guild.channels.cache.size.toString(), inline: true }
                    )
                    .setColor(0x00AE86);
                await message.reply({ embeds: [serverEmbed] });
                break;

            case 'servericon':
                const iconEmbed = new EmbedBuilder()
                    .setTitle(`Icône de ${message.guild.name}`)
                    .setImage(message.guild.iconURL({ dynamic: true, size: 512 }))
                    .setColor(0x00AE86);
                await message.reply({ embeds: [iconEmbed] });
                break;

            case 'user':
                const targetUser = message.mentions.users.first() || message.author;
                const member = message.guild.members.cache.get(targetUser.id);
                const userEmbed = new EmbedBuilder()
                    .setTitle(`Informations de ${targetUser.tag}`)
                    .setThumbnail(targetUser.displayAvatarURL())
                    .addFields(
                        { name: 'ID', value: targetUser.id, inline: true },
                        { name: 'Rejoint le', value: member?.joinedAt?.toDateString() || 'Inconnu', inline: true },
                        { name: 'Créé le', value: targetUser.createdAt.toDateString(), inline: true },
                        { name: 'Statut', value: member?.presence?.status || 'Inconnu', inline: true },
                        { name: 'Rôles', value: member?.roles.cache.size.toString() || '0', inline: true }
                    )
                    .setColor(0x00AE86);
                await message.reply({ embeds: [userEmbed] });
                break;

            case 'ping':
                await message.reply(`🏓 Pong! Latence: ${client.ws.ping}ms`);
                break;

            case 'membercount':
                await message.reply(`👥 Ce serveur compte **${message.guild.memberCount}** membres.`);
                break;

            case 'botinfo':
                const botInfoEmbed = new EmbedBuilder()
                    .setTitle('Informations du Bot')
                    .setThumbnail(client.user.displayAvatarURL())
                    .addFields(
                        { name: 'Nom', value: client.user.tag, inline: true },
                        { name: 'ID', value: client.user.id, inline: true },
                        { name: 'Serveurs', value: client.guilds.cache.size.toString(), inline: true },
                        { name: 'Utilisateurs', value: client.users.cache.size.toString(), inline: true },
                        { name: 'Uptime', value: `${Math.floor(client.uptime / 1000 / 60)} minutes`, inline: true },
                        { name: 'Version Node.js', value: process.version, inline: true }
                    )
                    .setColor(0x00AE86)
                    .setFooter({ text: 'Bot créé par Owner Kzr 🦸‍♀️' });
                await message.reply({ embeds: [botInfoEmbed] });
                break;

            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setTitle('📋 Menu Principal - Commandes du Bot')
                    .setDescription(`Bienvenue ! Voici toutes mes fonctionnalités disponibles.\n**Préfixe: ${PREFIX}**\n\n🤖 **Assistant IA** - Pingez-moi pour discuter !`)
                    .setColor(0x00AE86)
                    .addFields(
                        { name: '🎮 Divertissement', value: '`8ball`, `coinflip`, `roll`, `rps`, `guess`', inline: true },
                        { name: 'ℹ️ Information', value: '`avatar`, `server`, `servericon`, `user`, `ping`, `membercount`, `botinfo`', inline: true },
                        { name: '🔨 Modération', value: '`ban`, `kick`, `mute`, `timeout`, `warn`, `clear`, `nuke`, `purge`', inline: true },
                        { name: '🎭 Rôles', value: '`addrole`, `removerole`, `createrole`, `deleterole`, `giveroll`', inline: true },
                        { name: '⚙️ Administration', value: '`automod`, `autorole`, `setlogs`, `setserverlogs`, `dmall`', inline: true },
                        { name: '🎫 Tickets', value: '`setupticket`, `closeticket`', inline: true },
                        { name: '🔒 Sécurité', value: '`lockdown`, `unlock`, `slowmode`, `softban`, `unban`, `untimeout`', inline: true },
                        { name: '📝 Utilitaires', value: '`note`, `notes`, `delnote`, `translate`, `nickname`, `warnings`, `say`, `embed`, `poll`, `remind`', inline: true }
                    )
                    .setThumbnail(client.user.displayAvatarURL())
                    .setFooter({ text: `Bot créé par Owner Kzr 🦸‍♀️ • ${message.guild.memberCount} membres` })
                    .setTimestamp();

                const helpButtons = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('help_games')
                            .setLabel('🎮 Jeux')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('help_moderation')
                            .setLabel('🔨 Modération')
                            .setStyle(ButtonStyle.Danger),
                        new ButtonBuilder()
                            .setCustomId('help_admin')
                            .setLabel('⚙️ Administration')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('help_info')
                            .setLabel('ℹ️ Informations')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('help_utils')
                            .setLabel('📝 Utilitaires')
                            .setStyle(ButtonStyle.Primary)
                    );

                await message.reply({ embeds: [helpEmbed], components: [helpButtons] });
                break;

            case 'ban':
                if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de bannir des membres.');
                    return;
                }
                const userToBan = message.mentions.users.first();
                if (!userToBan) {
                    await message.reply('❌ Veuillez mentionner un utilisateur à bannir.');
                    return;
                }
                const banReason = args.slice(1).join(' ') || 'Aucune raison fournie';

                try {
                    await message.guild.members.ban(userToBan, { reason: banReason });
                    await message.reply(`✅ ${userToBan.tag} a été banni. Raison: ${banReason}`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du bannissement.');
                }
                break;

            case 'kick':
                if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'expulser des membres.');
                    return;
                }
                const userToKick = message.mentions.users.first();
                if (!userToKick) {
                    await message.reply('❌ Veuillez mentionner un utilisateur à expulser.');
                    return;
                }
                const kickReason = args.slice(1).join(' ') || 'Aucune raison fournie';

                try {
                    const memberToKick = message.guild.members.cache.get(userToKick.id);
                    await memberToKick.kick(kickReason);
                    await message.reply(`✅ ${userToKick.tag} a été expulsé. Raison: ${kickReason}`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de l\'expulsion.');
                }
                break;

            case 'mute':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de modérer des membres.');
                    return;
                }
                const userToMute = message.mentions.users.first();
                if (!userToMute) {
                    await message.reply('❌ Veuillez mentionner un utilisateur à muter.');
                    return;
                }
                const muteDuration = args[1] || '10m';
                const muteReason = args.slice(2).join(' ') || 'Aucune raison fournie';

                try {
                    const memberToMute = message.guild.members.cache.get(userToMute.id);
                    const duration = parseDuration(muteDuration);

                    if (!duration) {
                        await message.reply('❌ Format de durée invalide. Utilisez: 10m, 1h, 1d, etc.');
                        return;
                    }

                    await memberToMute.timeout(duration, muteReason);
                    await message.reply(`✅ ${userToMute.tag} a été mute pour ${muteDuration}. Raison: ${muteReason}`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du mute.');
                }
                break;

            case 'timeout':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de modérer des membres.');
                    return;
                }
                const userToTimeout = message.mentions.users.first();
                if (!userToTimeout) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }
                const timeoutDuration = args[1];
                if (!timeoutDuration) {
                    await message.reply('❌ Veuillez spécifier une durée (ex: 10m, 1h, 1d).');
                    return;
                }
                const timeoutReason = args.slice(2).join(' ') || 'Aucune raison fournie';

                try {
                    const memberToTimeout = message.guild.members.cache.get(userToTimeout.id);
                    const duration = parseDuration(timeoutDuration);

                    if (!duration) {
                        await message.reply('❌ Format de durée invalide. Utilisez: 10m, 1h, 1d, etc.');
                        return;
                    }

                    await memberToTimeout.timeout(duration, timeoutReason);
                    await message.reply(`✅ ${userToTimeout.tag} a été mis en timeout pour ${timeoutDuration}. Raison: ${timeoutReason}`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du timeout.');
                }
                break;

            case 'untimeout':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de modérer des membres.');
                    return;
                }
                const userToUntimeout = message.mentions.users.first();
                if (!userToUntimeout) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }

                try {
                    const memberToUntimeout = message.guild.members.cache.get(userToUntimeout.id);
                    await memberToUntimeout.timeout(null);
                    await message.reply(`✅ Le timeout de ${userToUntimeout.tag} a été retiré.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du retrait du timeout.');
                }
                break;

            case 'warn':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de modérer des membres.');
                    return;
                }
                const userToWarn = message.mentions.users.first();
                if (!userToWarn) {
                    await message.reply('❌ Veuillez mentionner un utilisateur à avertir.');
                    return;
                }
                const warnReason = args.slice(1).join(' ');
                if (!warnReason) {
                    await message.reply('❌ Veuillez spécifier une raison.');
                    return;
                }

                if (!warnings.has(userToWarn.id)) {
                    warnings.set(userToWarn.id, []);
                }

                warnings.get(userToWarn.id).push({
                    reason: warnReason,
                    moderator: message.author.id,
                    timestamp: new Date()
                });

                await message.reply(`⚠️ ${userToWarn.tag} a été averti. Raison: ${warnReason}`);
                break;

            case 'warnings':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de voir les avertissements.');
                    return;
                }
                const userToCheck = message.mentions.users.first() || message.author;
                const userWarnings = warnings.get(userToCheck.id) || [];

                if (userWarnings.length === 0) {
                    await message.reply(`${userToCheck.tag} n'a aucun avertissement.`);
                } else {
                    const warningsList = userWarnings.map((w, i) => 
                        `${i + 1}. ${w.reason} - Par <@${w.moderator}> le ${w.timestamp.toDateString()}`
                    ).join('\n');

                    const warningsEmbed = new EmbedBuilder()
                        .setTitle(`Avertissements de ${userToCheck.tag}`)
                        .setDescription(warningsList)
                        .setColor(0xFF0000);

                    await message.reply({ embeds: [warningsEmbed] });
                }
                break;

            case 'clear':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les messages.');
                    return;
                }
                const amount = parseInt(args[0]);
                if (isNaN(amount) || amount < 1 || amount > 100) {
                    await message.reply('❌ Veuillez spécifier un nombre entre 1 et 100.');
                    return;
                }

                try {
                    const deleted = await message.channel.bulkDelete(amount + 1, true);
                    const replyMsg = await message.channel.send(`✅ ${deleted.size - 1} messages supprimés.`);
                    setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
                } catch (error) {
                    await message.reply('❌ Erreur lors de la suppression.');
                }
                break;

            case 'purge':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les messages.');
                    return;
                }
                const userToPurge = message.mentions.users.first();
                if (!userToPurge) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }
                const purgeAmount = parseInt(args[1]) || 50;

                try {
                    const messages = await message.channel.messages.fetch({ limit: 100 });
                    const userMessages = messages.filter(msg => msg.author.id === userToPurge.id).first(purgeAmount);

                    for (const msg of userMessages) {
                        await msg.delete();
                    }

                    await message.delete();
                    const replyMsg = await message.channel.send(`✅ ${userMessages.length} messages de ${userToPurge.tag} supprimés.`);
                    setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
                } catch (error) {
                    await message.reply('❌ Erreur lors de la suppression.');
                }
                break;

            case 'nuke':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les salons.');
                    return;
                }
                try {
                    const channel = message.channel;
                    const newChannel = await channel.clone();
                    await channel.delete();
                    await newChannel.send('💥 Salon nuke!');
                } catch (error) {
                    await message.reply('❌ Erreur lors du nuke.');
                }
                break;

            case 'lockdown':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les salons.');
                    return;
                }
                try {
                    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: false
                    });
                    await message.reply('🔒 Salon verrouillé.');
                } catch (error) {
                    await message.reply('❌ Erreur lors du verrouillage.');
                }
                break;

            case 'unlock':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les salons.');
                    return;
                }
                try {
                    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: null
                    });
                    await message.reply('🔓 Salon déverrouillé.');
                } catch (error) {
                    await message.reply('❌ Erreur lors du déverrouillage.');
                }
                break;

            case 'slowmode':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les salons.');
                    return;
                }
                const seconds = parseInt(args[0]);
                if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
                    await message.reply('❌ Veuillez spécifier un nombre entre 0 et 21600 secondes.');
                    return;
                }

                try {
                    await message.channel.setRateLimitPerUser(seconds);
                    await message.reply(`⏱️ Mode lent activé: ${seconds} secondes.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de l\'activation du mode lent.');
                }
                break;

            case 'addrole':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les rôles.');
                    return;
                }
                const userForRole = message.mentions.users.first();
                const roleToAdd = message.mentions.roles.first();
                if (!userForRole || !roleToAdd) {
                    await message.reply('❌ Veuillez mentionner un utilisateur et un rôle.');
                    return;
                }

                try {
                    const member = message.guild.members.cache.get(userForRole.id);
                    await member.roles.add(roleToAdd);
                    await message.reply(`✅ Rôle ${roleToAdd.name} ajouté à ${userForRole.tag}.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de l\'ajout du rôle.');
                }
                break;

            case 'removerole':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les rôles.');
                    return;
                }
                const userForRoleRemove = message.mentions.users.first();
                const roleToRemove = message.mentions.roles.first();
                if (!userForRoleRemove || !roleToRemove) {
                    await message.reply('❌ Veuillez mentionner un utilisateur et un rôle.');
                    return;
                }

                try {
                    const member = message.guild.members.cache.get(userForRoleRemove.id);
                    await member.roles.remove(roleToRemove);
                    await message.reply(`✅ Rôle ${roleToRemove.name} retiré de ${userForRoleRemove.tag}.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du retrait du rôle.');
                }
                break;

            case 'createrole':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les rôles.');
                    return;
                }
                const roleName = args.join(' ');
                if (!roleName) {
                    await message.reply('❌ Veuillez spécifier un nom pour le rôle.');
                    return;
                }

                try {
                    const newRole = await message.guild.roles.create({
                        name: roleName,
                        reason: `Créé par ${message.author.tag}`
                    });
                    await message.reply(`✅ Rôle "${roleName}" créé avec succès.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de la création du rôle.');
                }
                break;

            case 'deleterole':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les rôles.');
                    return;
                }
                const roleToDelete = message.mentions.roles.first();
                if (!roleToDelete) {
                    await message.reply('❌ Veuillez mentionner un rôle à supprimer.');
                    return;
                }

                try {
                    await roleToDelete.delete();
                    await message.reply(`✅ Rôle "${roleToDelete.name}" supprimé.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de la suppression du rôle.');
                }
                break;

            case 'giveroll':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les rôles.');
                    return;
                }
                const userForRandomRole = message.mentions.users.first();
                if (!userForRandomRole) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }

                try {
                    const roles = message.guild.roles.cache.filter(role => !role.managed && role.name !== '@everyone');
                    const randomRole = roles.random();
                    const member = message.guild.members.cache.get(userForRandomRole.id);
                    await member.roles.add(randomRole);
                    await message.reply(`✅ Rôle aléatoire "${randomRole.name}" donné à ${userForRandomRole.tag}.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de l\'attribution du rôle aléatoire.');
                }
                break;

            case 'dmall':
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'administrateur.');
                    return;
                }
                const dmMessage = args.join(' ');
                if (!dmMessage) {
                    await message.reply('❌ Veuillez spécifier un message.');
                    return;
                }

                try {
                    const loadingMsg = await message.reply('⏳ Envoi en cours...');
                    const members = await message.guild.members.fetch();
                    let sent = 0;

                    for (const member of members.values()) {
                        if (!member.user.bot) {
                            try {
                                await member.send(dmMessage);
                                sent++;
                            } catch (error) {
                                // Ignore les erreurs de DM
                            }
                        }
                    }

                    await loadingMsg.edit(`✅ Message envoyé à ${sent} membres.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors de l\'envoi des messages.');
                }
                break;

            case 'setlogs':
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'administrateur.');
                    return;
                }
                const logChannel = message.mentions.channels.first();
                if (!logChannel) {
                    await message.reply('❌ Veuillez mentionner un salon.');
                    return;
                }
                serverSettings.set(`${message.guild.id}_logs`, logChannel.id);
                await message.reply(`✅ Salon de logs configuré: ${logChannel}`);
                break;

            case 'setserverlogs':
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'administrateur.');
                    return;
                }
                const serverLogChannel = message.mentions.channels.first();
                if (!serverLogChannel) {
                    await message.reply('❌ Veuillez mentionner un salon.');
                    return;
                }
                serverSettings.set(`${message.guild.id}_serverlogs`, serverLogChannel.id);
                await message.reply(`✅ Salon de logs du serveur configuré: ${serverLogChannel}`);
                break;

            case 'automod':
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'administrateur.');
                    return;
                }
                const automodEnabled = args[0] === 'true' || args[0] === 'on';
                serverSettings.set(`${message.guild.id}_automod`, automodEnabled);
                await message.reply(`✅ Auto-modération ${automodEnabled ? 'activée' : 'désactivée'}.`);
                break;

            case 'autorole':
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'administrateur.');
                    return;
                }
                const autoRole = message.mentions.roles.first();
                if (!autoRole) {
                    await message.reply('❌ Veuillez mentionner un rôle.');
                    return;
                }
                serverSettings.set(`${message.guild.id}_autorole`, autoRole.id);
                await message.reply(`✅ Auto-rôle configuré: ${autoRole.name}`);
                break;

            case 'setupticket':
                if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    await message.reply('❌ Vous n\'avez pas la permission d\'administrateur.');
                    return;
                }
                const ticketCategory = message.mentions.channels.first();
                if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
                    await message.reply('❌ Veuillez mentionner une catégorie valide.');
                    return;
                }
                serverSettings.set(`${message.guild.id}_ticketcategory`, ticketCategory.id);
                await message.reply(`✅ Système de tickets configuré dans la catégorie: ${ticketCategory.name}`);
                break;

            case 'closeticket':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les salons.');
                    return;
                }
                if (message.channel.name.startsWith('ticket-')) {
                    await message.reply('🎫 Fermeture du ticket...');
                    setTimeout(() => {
                        message.channel.delete();
                    }, 5000);
                } else {
                    await message.reply('❌ Cette commande ne peut être utilisée que dans un salon de ticket.');
                }
                break;

            case 'unban':
                if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de bannir des membres.');
                    return;
                }
                const userIdToUnban = args[0];
                if (!userIdToUnban) {
                    await message.reply('❌ Veuillez spécifier l\'ID de l\'utilisateur à débannir.');
                    return;
                }

                try {
                    await message.guild.members.unban(userIdToUnban);
                    await message.reply(`✅ Utilisateur ${userIdToUnban} débanni.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du débannissement.');
                }
                break;

            case 'softban':
                if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de bannir des membres.');
                    return;
                }
                const userToSoftban = message.mentions.users.first();
                if (!userToSoftban) {
                    await message.reply('❌ Veuillez mentionner un utilisateur à softban.');
                    return;
                }
                const softbanReason = args.slice(1).join(' ') || 'Aucune raison fournie';

                try {
                    await message.guild.members.ban(userToSoftban, { reason: softbanReason });
                    await message.guild.members.unban(userToSoftban);
                    await message.reply(`✅ ${userToSoftban.tag} a été softban.`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du softban.');
                }
                break;

            case 'translate':
                const textToTranslate = args.join(' ');
                if (!textToTranslate) {
                    await message.reply('❌ Veuillez spécifier un texte à traduire.');
                    return;
                }
                await message.reply(`🌐 Traduction demandée: "${textToTranslate}"\n(Fonction de traduction à implémenter avec une API)`);
                break;

            case 'note':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de modérer des membres.');
                    return;
                }
                const userForNote = message.mentions.users.first();
                if (!userForNote) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }
                const noteText = args.slice(1).join(' ');
                if (!noteText) {
                    await message.reply('❌ Veuillez spécifier une note.');
                    return;
                }

                if (!notes.has(userForNote.id)) {
                    notes.set(userForNote.id, []);
                }

                notes.get(userForNote.id).push({
                    note: noteText,
                    moderator: message.author.id,
                    timestamp: new Date()
                });

                await message.reply(`📝 Note ajoutée pour ${userForNote.tag}.`);
                break;

            case 'notes':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de voir les notes.');
                    return;
                }
                const userForNotes = message.mentions.users.first() || message.author;
                const userNotes = notes.get(userForNotes.id) || [];

                if (userNotes.length === 0) {
                    await message.reply(`${userForNotes.tag} n'a aucune note.`);
                } else {
                    const notesList = userNotes.map((n, i) => 
                        `${i + 1}. ${n.note} - Par <@${n.moderator}> le ${n.timestamp.toDateString()}`
                    ).join('\n');

                    const notesEmbed = new EmbedBuilder()
                        .setTitle(`Notes de ${userForNotes.tag}`)
                        .setDescription(notesList)
                        .setColor(0x0099FF);

                    await message.reply({ embeds: [notesEmbed] });
                }
                break;

            case 'delnote':
                if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    await message.reply('❌ Vous n\'avez pas la permission de modérer des membres.');
                    return;
                }
                const userForDelNote = message.mentions.users.first();
                if (!userForDelNote) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }
                const noteIndex = parseInt(args[1]) - 1;
                if (isNaN(noteIndex)) {
                    await message.reply('❌ Veuillez spécifier l\'index de la note à supprimer.');
                    return;
                }

                if (!notes.has(userForDelNote.id) || !notes.get(userForDelNote.id)[noteIndex]) {
                    await message.reply('❌ Note non trouvée.');
                    return;
                }

                notes.get(userForDelNote.id).splice(noteIndex, 1);
                await message.reply(`✅ Note supprimée pour ${userForDelNote.tag}.`);
                break;

            case 'nickname':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les surnoms.');
                    return;
                }
                const userForNickname = message.mentions.users.first();
                if (!userForNickname) {
                    await message.reply('❌ Veuillez mentionner un utilisateur.');
                    return;
                }
                const newNickname = args.slice(1).join(' ');
                if (!newNickname) {
                    await message.reply('❌ Veuillez spécifier un nouveau surnom.');
                    return;
                }

                try {
                    const member = message.guild.members.cache.get(userForNickname.id);
                    await member.setNickname(newNickname);
                    await message.reply(`✅ Surnom de ${userForNickname.tag} changé en "${newNickname}".`);
                } catch (error) {
                    await message.reply('❌ Erreur lors du changement de surnom.');
                }
                break;

            case 'say':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les messages.');
                    return;
                }
                const sayMessage = args.join(' ');
                if (!sayMessage) {
                    await message.reply('❌ Veuillez spécifier un message.');
                    return;
                }
                await message.delete();
                await message.channel.send(sayMessage);
                break;

            case 'embed':
                if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                    await message.reply('❌ Vous n\'avez pas la permission de gérer les messages.');
                    return;
                }
                const embedArgs = args.join(' ').split('|');
                if (embedArgs.length < 2) {
                    await message.reply('❌ Format: )embed titre | description | couleur(optionnel)');
                    return;
                }

                const embedTitle = embedArgs[0].trim();
                const embedDescription = embedArgs[1].trim();
                const embedColor = embedArgs[2] ? embedArgs[2].trim() : '#0099FF';

                const customEmbed = new EmbedBuilder()
                    .setTitle(embedTitle)
                    .setDescription(embedDescription)
                    .setColor(embedColor)
                    .setTimestamp();

                await message.reply({ embeds: [customEmbed] });
                break;

            case 'poll':
                const pollArgs = args.join(' ').split('|');
                if (pollArgs.length < 3) {
                    await message.reply('❌ Format: )poll question | option1 | option2 | ...');
                    return;
                }

                const pollQuestion = pollArgs[0].trim();
                const pollOptions = pollArgs.slice(1).map(opt => opt.trim());

                if (pollOptions.length < 2 || pollOptions.length > 10) {
                    await message.reply('❌ Le sondage doit avoir entre 2 et 10 options.');
                    return;
                }

                const pollEmbed = new EmbedBuilder()
                    .setTitle('📊 Sondage')
                    .setDescription(pollQuestion)
                    .setColor(0x0099FF);

                const pollDescription = pollOptions.map((opt, i) => 
                    `${String.fromCharCode(65 + i)} - ${opt}`
                ).join('\n');

                pollEmbed.addFields({ name: 'Options:', value: pollDescription });

                const pollMessage = await message.reply({ embeds: [pollEmbed] });

                for (let i = 0; i < pollOptions.length; i++) {
                    const emoji = String.fromCharCode(65 + i) + '️⃣';
                    await pollMessage.react(emoji);
                }
                break;

            case 'remind':
                if (args.length < 2) {
                    await message.reply('❌ Format: )remind 5m Message de rappel');
                    return;
                }
                const reminderTime = args[0];
                const reminderMessage = args.slice(1).join(' ');

                const reminderDuration = parseDuration(reminderTime);
                if (!reminderDuration) {
                    await message.reply('❌ Format de temps invalide. Utilisez: 5m, 1h, 2d, etc.');
                    return;
                }

                await message.reply(`⏰ Rappel configuré pour dans ${reminderTime}!`);

                setTimeout(async () => {
                    try {
                        await message.channel.send(`⏰ <@${message.author.id}> Rappel: ${reminderMessage}`);
                    } catch (error) {
                        console.error('Erreur lors du rappel:', error);
                    }
                }, reminderDuration);
                break;

            default:
                // Ne pas répondre pour les commandes inconnues
                break;
        }
    } catch (error) {
        console.error(error);
        await message.reply('❌ Une erreur est survenue lors de l\'exécution de la commande.');
    }
});

// Gestion des interactions de boutons
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    try {
        let categoryEmbed;
        
        switch (customId) {
            case 'help_games':
                categoryEmbed = new EmbedBuilder()
                    .setTitle('🎮 Commandes de Divertissement')
                    .setColor(0x9b59b6)
                    .addFields(
                        { name: `${PREFIX}8ball <question>`, value: 'Boule magique qui répond à vos questions', inline: false },
                        { name: `${PREFIX}coinflip`, value: 'Lance une pièce (pile ou face)', inline: false },
                        { name: `${PREFIX}roll [nombre]`, value: 'Lance un dé (6 faces par défaut)', inline: false },
                        { name: `${PREFIX}rps <choix>`, value: 'Pierre, feuille, ciseaux contre le bot', inline: false },
                        { name: `${PREFIX}guess <nombre>`, value: 'Devinez un nombre entre 1 et 100', inline: false }
                    )
                    .setThumbnail('https://emoji.discord.st/emojis/8b8ea8bb-1de8-4583-9de2-0bd8a9646499.gif')
                    .setFooter({ text: 'Amusez-vous bien ! 🎲' });
                break;

            case 'help_moderation':
                categoryEmbed = new EmbedBuilder()
                    .setTitle('🔨 Commandes de Modération')
                    .setColor(0xe74c3c)
                    .addFields(
                        { name: `${PREFIX}ban <@user> [raison]`, value: 'Bannir un membre du serveur', inline: false },
                        { name: `${PREFIX}kick <@user> [raison]`, value: 'Expulser un membre du serveur', inline: false },
                        { name: `${PREFIX}mute <@user> [durée] [raison]`, value: 'Muter un membre temporairement', inline: false },
                        { name: `${PREFIX}warn <@user> <raison>`, value: 'Avertir un membre', inline: false },
                        { name: `${PREFIX}clear <nombre>`, value: 'Supprimer des messages (1-100)', inline: false },
                        { name: `${PREFIX}timeout <@user> <durée>`, value: 'Mettre en timeout un membre', inline: false },
                        { name: `${PREFIX}softban <@user>`, value: 'Bannir puis débannir (supprime messages)', inline: false }
                    )
                    .setFooter({ text: 'Modération requise • Utilisez avec responsabilité' });
                break;

            case 'help_admin':
                categoryEmbed = new EmbedBuilder()
                    .setTitle('⚙️ Commandes d\'Administration')
                    .setColor(0x34495e)
                    .addFields(
                        { name: `${PREFIX}automod <on/off>`, value: 'Activer/désactiver l\'auto-modération', inline: false },
                        { name: `${PREFIX}autorole <@role>`, value: 'Configurer un rôle automatique', inline: false },
                        { name: `${PREFIX}setlogs <#channel>`, value: 'Définir le salon de logs', inline: false },
                        { name: `${PREFIX}dmall <message>`, value: 'Envoyer un MP à tous les membres', inline: false },
                        { name: `${PREFIX}setupticket <catégorie>`, value: 'Configurer le système de tickets', inline: false },
                        { name: `${PREFIX}lockdown / ${PREFIX}unlock`, value: 'Verrouiller/déverrouiller le salon', inline: false }
                    )
                    .setFooter({ text: 'Permissions administrateur requises' });
                break;

            case 'help_info':
                categoryEmbed = new EmbedBuilder()
                    .setTitle('ℹ️ Commandes d\'Information')
                    .setColor(0x3498db)
                    .addFields(
                        { name: `${PREFIX}avatar [@user]`, value: 'Afficher l\'avatar d\'un utilisateur', inline: false },
                        { name: `${PREFIX}server`, value: 'Informations sur le serveur', inline: false },
                        { name: `${PREFIX}user [@user]`, value: 'Informations sur un utilisateur', inline: false },
                        { name: `${PREFIX}ping`, value: 'Vérifier la latence du bot', inline: false },
                        { name: `${PREFIX}botinfo`, value: 'Informations sur le bot', inline: false },
                        { name: `${PREFIX}membercount`, value: 'Nombre de membres du serveur', inline: false }
                    )
                    .setFooter({ text: 'Obtenez toutes les infos nécessaires !' });
                break;

            case 'help_utils':
                categoryEmbed = new EmbedBuilder()
                    .setTitle('📝 Commandes Utilitaires')
                    .setColor(0x2ecc71)
                    .addFields(
                        { name: `${PREFIX}note <@user> <note>`, value: 'Ajouter une note sur un utilisateur', inline: false },
                        { name: `${PREFIX}notes [@user]`, value: 'Voir les notes d\'un utilisateur', inline: false },
                        { name: `${PREFIX}remind <temps> <message>`, value: 'Programmer un rappel', inline: false },
                        { name: `${PREFIX}poll question | opt1 | opt2`, value: 'Créer un sondage', inline: false },
                        { name: `${PREFIX}translate <texte>`, value: 'Traduire un texte', inline: false },
                        { name: `${PREFIX}say <message>`, value: 'Faire parler le bot', inline: false }
                    )
                    .setFooter({ text: 'Outils pratiques pour votre serveur' });
                break;
        }

        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('help_back')
                    .setLabel('⬅️ Retour au menu')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [categoryEmbed], components: [backButton] });

    } catch (error) {
        console.error('Erreur interaction bouton:', error);
        await interaction.reply({ content: '❌ Une erreur est survenue.', ephemeral: true });
    }
});

// Gestion des nouveaux membres pour l'auto-rôle
client.on('guildMemberAdd', async member => {
    const autoRoleId = serverSettings.get(`${member.guild.id}_autorole`);
    if (autoRoleId) {
        try {
            const role = member.guild.roles.cache.get(autoRoleId);
            if (role) {
                await member.roles.add(role);
            }
        } catch (error) {
            console.error('Erreur auto-rôle:', error);
        }
    }
});

// Connexion du bot
client.login('MTM0MjEwNzI4MTg2MDU5NTc5NA.GplqP3.VfC_LbLcixQbYHcx7EbAOptW4sE4SbP690_iHo');
