// ============================================
// 🤖 Biodance Discord Bot
// 1) 서버 입장 시 → 개인 DM 환영 메시지
// 2) 티어 역할 부여 시 → 해당 채널에 축하 메시지
// ============================================

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// ─────────────────────────────────────────────
// ⚙️ 설정 (여기만 수정하면 됩니다!)
// ─────────────────────────────────────────────

const CONFIG = {
  // 봇 토큰 (Discord Developer Portal에서 복사)
  TOKEN: process.env.DISCORD_TOKEN || '여기에_봇_토큰_붙여넣기',

  // 각 티어 역할의 ID (서버 설정 > 역할에서 우클릭 > ID 복사)
  ROLES: {
    NEW_CREATOR:    '여기에_new_creator_역할_ID',
    ACTIVE_CREATOR: '여기에_active_creator_역할_ID',
    VIP_CREATOR:    '여기에_vip_creator_역할_ID',
    VVIP_CREATOR:   '여기에_vvip_creator_역할_ID',
  },

  // 환영 메시지를 보낼 채널 ID (각 티어 채널의 ID)
  CHANNELS: {
    NEW_CREATOR:    '여기에_new_creator_채널_ID',
    ACTIVE_CREATOR: '여기에_active_creator_채널_ID',
    VIP_CREATOR:    '여기에_vip_creator_채널_ID',
    VVIP_CREATOR:   '여기에_vvip_creator_채널_ID',
  },
};

// ─────────────────────────────────────────────
// 💌 서버 입장 시 DM 환영 메시지
// (새로 들어온 사람에게 개인 DM으로 보내는 메시지)
// ─────────────────────────────────────────────

const DM_WELCOME = {
  color: 0x5865F2,
  title: 'Welcome to Biodance Global! 💙',
  description:
    `Hi there! 👋\n\n` +
    `Thank you for joining the **Biodance Creator Community**!\n\n` +
    `We're so excited to have you here. This is your space to connect with the Biodance team, ` +
    `get the latest product updates, and grow as a creator! 🚀\n\n` +
    `Here's how to get started:\n\n` +
    `📌 **Check out the guidelines** — Everything you need to know about our community\n` +
    `🎬 **Join the Euka Contest** — Upload videos, earn rewards!\n` +
    `💬 **Ask questions** — Our team is here to help\n\n` +
    `Let's create something amazing together! ✨`,
  footer: 'Biodance Creator Community',
};

// ─────────────────────────────────────────────
// 🎨 티어별 채널 환영 메시지
// (역할 부여 시 해당 채널에 보내는 메시지)
// ─────────────────────────────────────────────

const WELCOME_MESSAGES = {
  NEW_CREATOR: {
    color: 0x3BA55D,
    emoji: '🌱',
    title: 'Welcome to Biodance! 🎉',
    getDescription: (member) =>
      `Hey ${member}! Welcome to the Biodance Creator Community!\n\n` +
      `You just uploaded your first video — that's amazing! 🎬\n` +
      `This is your first step into the Biodance family.\n\n` +
      `📌 Check out the pinned guidelines to get started!\n` +
      `💬 Feel free to ask any questions here.`,
    footer: '🌱 new-creator',
  },

  ACTIVE_CREATOR: {
    color: 0x5865F2,
    emoji: '👟',
    title: 'You Made Your First Sale! 💰🎉',
    getDescription: (member) =>
      `Congrats ${member}! You just started making sales!\n\n` +
      `You're officially an Active Creator now — this is where the real journey begins! 🚀\n\n` +
      `💡 Keep pushing — every dollar counts toward your next tier!\n` +
      `📈 We'll share content tips and trends right here in this channel.`,
    footer: '👟 active-creator',
  },

  VIP_CREATOR: {
    color: 0xF0B232,
    emoji: '⭐',
    title: 'VIP Creator Achieved! 🏆',
    getDescription: (member) =>
      `${member} just hit VIP status! Incredible work! 🔥\n\n` +
      `$500+ GMV — you're one of our top-performing creators.\n\n` +
      `⭐ You now get early access to new product info & insider trends\n` +
      `🎯 Your reward is on the way!\n\n` +
      `Keep going — VVIP is within reach! 👑`,
    footer: '⭐ vip-creator',
  },

  VVIP_CREATOR: {
    color: 0xE91E63,
    emoji: '👑',
    title: 'VVIP Creator! You\'re a Legend! 👑✨',
    getDescription: (member) =>
      `${member} just reached VVIP! $1,000+ GMV! 🎊\n\n` +
      `You're officially one of Biodance's elite creators.\n\n` +
      `👑 First access to everything — new launches, campaigns, insider info\n` +
      `🏆 Your reward is on the way!\n\n` +
      `Thank you for being an incredible part of the Biodance family! 💙`,
    footer: '👑 vvip-creator',
  },
};

// ─────────────────────────────────────────────
// 🤖 봇 코드 (여기는 수정 안 해도 됩니다)
// ─────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// 봇이 켜졌을 때
client.once('ready', () => {
  console.log(`✅ ${client.user.tag} 봇이 온라인입니다!`);
  console.log(`📊 서버 ${client.guilds.cache.size}개에 연결됨`);
});

// ──────────────────────────────────────
// 기능 1: 서버에 새로 들어오면 DM 전송
// ──────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  try {
    const embed = new EmbedBuilder()
      .setColor(DM_WELCOME.color)
      .setTitle(DM_WELCOME.title)
      .setDescription(DM_WELCOME.description)
      .setFooter({ text: DM_WELCOME.footer })
      .setTimestamp();

    await member.send({ embeds: [embed] });
    console.log(`✅ ${member.user.tag}에게 DM 환영 메시지 전송 완료`);
  } catch (error) {
    // DM을 막아둔 유저는 메시지를 보낼 수 없음
    console.log(`⚠️ ${member.user.tag}에게 DM 전송 실패 (DM이 꺼져있을 수 있음)`);
  }
});

// ──────────────────────────────────────
// 기능 2: 역할 부여 시 채널에 축하 메시지
// ──────────────────────────────────────
client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const addedRoles = newMember.roles.cache.filter(
      role => !oldMember.roles.cache.has(role.id)
    );

    if (addedRoles.size === 0) return;

    const tierChecks = [
      { roleId: CONFIG.ROLES.VVIP_CREATOR,   channelId: CONFIG.CHANNELS.VVIP_CREATOR,   msgKey: 'VVIP_CREATOR' },
      { roleId: CONFIG.ROLES.VIP_CREATOR,    channelId: CONFIG.CHANNELS.VIP_CREATOR,    msgKey: 'VIP_CREATOR' },
      { roleId: CONFIG.ROLES.ACTIVE_CREATOR, channelId: CONFIG.CHANNELS.ACTIVE_CREATOR, msgKey: 'ACTIVE_CREATOR' },
      { roleId: CONFIG.ROLES.NEW_CREATOR,    channelId: CONFIG.CHANNELS.NEW_CREATOR,    msgKey: 'NEW_CREATOR' },
    ];

    for (const tier of tierChecks) {
      if (addedRoles.has(tier.roleId)) {
        const channel = newMember.guild.channels.cache.get(tier.channelId);
        if (!channel) {
          console.error(`❌ 채널을 찾을 수 없음: ${tier.channelId}`);
          continue;
        }

        const msg = WELCOME_MESSAGES[tier.msgKey];
        const embed = new EmbedBuilder()
          .setColor(msg.color)
          .setTitle(`${msg.emoji} ${msg.title}`)
          .setDescription(msg.getDescription(newMember))
          .setFooter({ text: msg.footer })
          .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`✅ ${newMember.user.tag}에게 ${tier.msgKey} 환영 메시지 전송 완료`);
      }
    }
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  }
});

// 봇 로그인
client.login(CONFIG.TOKEN);
