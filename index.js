const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

const afkUsers = new Map();
const whitelistedUsers = new Set();

// Role IDs
const SAY_AND_WHITELIST_ROLE = '1491422119567953920';
const MOD_ROLES = ['1491424472404590704', '1491424599576018954'];

const URL_REGEX = /https?:\/\/\S+|discord(?:app\.com\/invite|\.gg)\/\S+/gi;

function hasSayWhitelistRole(member) {
    return member.roles.cache.has(SAY_AND_WHITELIST_ROLE);
}

function hasModRole(member) {
    return MOD_ROLES.some(id => member.roles.cache.has(id));
}

client.once('ready', () => {
    console.log(`Bot online as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const prefix = '.';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    const member = message.member;
    if (!member) return;

    // AFK (everyone)
    if (command === 'afk') {
        const reason = args.join(' ') || 'No reason given';
        afkUsers.set(message.author.id, { reason, time: Date.now() });

        const embed = new EmbedBuilder()
            .setTitle('I setted up your afk')
            .setColor(0x00ff00)
            .addFields({ name: '**Reason**', value: reason })
            .setFooter({ text: `Requested by ${message.author.tag}` });

        await message.channel.send({ embeds: [embed] });

        try {
            await message.member.setNickname(`[AFK] ${message.member.displayName}`.slice(0, 32));
        } catch {}
        return;
    }

    // Say - only specific role
    if (command === 'say') {
        if (!hasSayWhitelistRole(member)) {
            return message.reply("❌ You don't have permission to use this command.").then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
        }

        const channel = message.mentions.channels.first();
        const text = args.slice(1).join(' ');

        if (!channel || !text) {
            return message.reply('Usage: .say #channel message').then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
        }

        try { await message.delete(); } catch {}
        try {
            await channel.send(text);
        } catch {
            message.reply("Can't send in that channel").then(m => setTimeout(() => m.delete().catch(() => {}), 8000));
        }
        return;
    }

    // Anti-Link (always active)
    if (URL_REGEX.test(message.content) && !whitelistedUsers.has(message.author.id)) {
        try { await message.delete(); } catch {}
        return message.channel.send(`${message.author} You're not whitelisted to send links.`)
            .then(m => setTimeout(() => m.delete().catch(() => {}), 10000));
    }

    // AFK ping check
    for (const [userId, data] of afkUsers.entries()) {
        if (message.author.id === userId) {
            afkUsers.delete(userId);
            try {
                await message.member.setNickname(message.member.displayName.replace('[AFK] ', '').slice(0, 32));
            } catch {}
            await message.channel.send(`Welcome back ${message.author}! AFK removed.`);
            break;
        }

        if (message.mentions.users.has(userId)) {
            const minutes = Math.floor((Date.now() - data.time) / 60000);
            const embed = new EmbedBuilder()
                .setTitle(`${message.author} mentioned an AFK user`)
                .setDescription(`<@${userId}> is afk`)
                .setColor(0xff0000)
                .addFields({ name: '**Reason**', value: data.reason })
                .setFooter({ text: `AFK for about \( {minutes} minute \){minutes !== 1 ? 's' : ''}` });

            await message.channel.send({ embeds: [embed] });
            break;
        }
    }

    // Whitelist / Unwhitelist - only the say/whitelist role
    if (command === 'whitelist' && hasSayWhitelistRole(member)) {
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target) return message.reply('Mention a user');

        whitelistedUsers.add(target.id);

        const embed = new EmbedBuilder()
            .setTitle(`You've been whitelisted by ${message.author.tag}`)
            .setDescription('U can now post links links anymore')
            .setColor(0x00ff00)
            .addFields({ name: 'Reason', value: reason });

        await message.channel.send({ embeds: [embed] });
        return;
    }

    if (command === 'unwhitelist' && hasSayWhitelistRole(member)) {
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target) return message.reply('Mention a user');

        whitelistedUsers.delete(target.id);

        const embed = new EmbedBuilder()
            .setTitle(`You've been unwhitelisted by ${message.author.tag}`)
            .setColor(0xff0000)
            .addFields({ name: '**Reason**', value: reason });

        await message.channel.send({ embeds: [embed] });
        return;
    }

    // === MOD COMMANDS (only mod roles) ===
    if (!hasModRole(member)) return;

    if (command === 'warn') {
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target) return;

        const embed = new EmbedBuilder()
            .setTitle(`${target} has been warned`)
            .setColor(0x00ff00)
            .addFields({ name: 'Reason', value: reason })
            .setFooter({ text: `Warned by ${message.author.tag}` });

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'removewarn') {
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target) return;

        const embed = new EmbedBuilder()
            .setTitle(`${target} has been unwarned by ${message.author.tag}`)
            .setColor(0xff0000)
            .addFields({ name: 'Reason', value: reason });

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'timeout') {
        const target = message.mentions.members.first();
        const durationStr = args[1];
        const reason = args.slice(2).join(' ') || 'No reason provided';
        if (!target || !durationStr) return message.reply('Usage: .timeout @user 10m reason');

        let ms = 0;
        if (durationStr.endsWith('m')) ms = parseInt(durationStr) * 60 * 1000;
        else if (durationStr.endsWith('h')) ms = parseInt(durationStr) * 60 * 60 * 1000;
        else if (durationStr.endsWith('d')) ms = parseInt(durationStr) * 24 * 60 * 60 * 1000;

        if (ms === 0) return message.reply('Use 10m, 1h or 1d');

        await target.timeout(ms, reason);

        const embed = new EmbedBuilder()
            .setTitle(`${target} has been timed out by ${message.author.tag}`)
            .setColor(0x00ff00)
            .addFields({ name: 'Duration', value: durationStr }, { name: 'Reason', value: reason });

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'untimeout') {
        const target = message.mentions.members.first();
        if (!target) return;

        await target.timeout(null);

        const embed = new EmbedBuilder()
            .setTitle(`${target} has been untimeout by ${message.author.tag}`)
            .setColor(0xff0000);

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'kick') {
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target) return;

        await target.kick(reason);

        const embed = new EmbedBuilder()
            .setTitle(`${target} has been kicked by ${message.author.tag}`)
            .setColor(0xff0000)
            .addFields({ name: 'Reason', value: reason });

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'ban') {
        const target = message.mentions.members.first();
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!target) return;

        await target.ban({ reason });

        const embed = new EmbedBuilder()
            .setTitle(`${target} has been banned by ${message.author.tag}`)
            .setColor(0xff0000)
            .addFields({ name: 'Reason', value: reason });

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'unban') {
        const userId = args[0];
        const reason = args.slice(1).join(' ') || 'No reason provided';
        if (!userId) return message.reply('Usage: .unban userID reason');

        const user = await client.users.fetch(userId).catch(() => null);
        if (!user) return message.reply('User not found');

        await message.guild.members.unban(user.id, reason);

        const embed = new EmbedBuilder()
            .setTitle(`${user.tag} has been unbanned by ${message.author.tag}`)
            .setColor(0x00ff00)
            .addFields({ name: 'Reason', value: reason });

        await message.channel.send({ embeds: [embed] });
    }

    if (command === 'role' || command === 'unrole') {
        const target = message.mentions.members.first();
        const roleInput = args[1];
        if (!target || !roleInput) return;

        let role = message.guild.roles.cache.get(roleInput) || 
                   message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());

        if (!role) return message.reply('Role not found');

        if (command === 'role') {
            await target.roles.add(role);
            const embed = new EmbedBuilder().setTitle('✅ Role Added').setDescription(`Added **${role.name}** to ${target}`).setColor(0x00ff00);
            await message.channel.send({ embeds: [embed] });
        } else {
            await target.roles.remove(role);
            const embed = new EmbedBuilder().setTitle('Role Removed').setDescription(`Removed **${role.name}** from ${target}`).setColor(0xff0000);
            await message.channel.send({ embeds: [embed] });
        }
    }
});

client.login('process.env.TOKEN');   // ← Change to process.env.TOKEN for Railway
