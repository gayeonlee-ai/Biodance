const { Client, GatewayIntentBits, EmbedBuilder, Partials } = require("discord.js");
const http = require("http");

// Render 무료 플랜용 웹서버
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Biodance Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
  console.log("웹서버가 포트 " + PORT + "에서 실행 중");
});

// 설정
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  ROLES: {
    NEW_CREATOR:    "1528628841743126566",
    ACTIVE_CREATOR: "1528628980310085683",
    VIP_CREATOR:    "1528629154021376071",
    VVIP_CREATOR:   "",
  },
  CHANNELS: {
    NEW_CREATOR:    "1525810100470677555",
    ACTIVE_CREATOR: "1525809411841589348",
    VIP_CREATOR:    "1525809262117257376",
    VVIP_CREATOR:   "",
  },
};

// 서버 첫 입장 DM
const DM_WELCOME = {
  color: 0x5865F2,
  title: "Welcome to Biodance Global! 💙",
  description:
    "Hi there! 👋\n\n" +
    "Thank you for joining the **Biodance Creator Community**!\n\n" +
    "We are so excited to have you here. This is your space to connect with the Biodance team, " +
    "get the latest updates, and grow as a creator! 🚀\n\n" +
    "**Here is how to get started:**\n" +
    "📌 Check out the guidelines\n" +
    "🎬 Join the Euka Contest — upload videos & earn rewards!\n" +
    "💬 Ask us anything — we are here to help\n\n" +
    "Let us create something amazing together! ✨",
  footer: "Biodance Creator Community",
};

// 채널 공개 메시지
const PUBLIC_MESSAGES = {
  NEW_CREATOR: {
    color: 0x3BA55D,
    emoji: "🌱",
    title: "New Creator Alert! 🎉",
    getDescription: function(member) {
      return "Everyone welcome " + member + "! 👏\n\n" +
        "They just uploaded their first video — the journey begins! 🎬\n\n" +
        "Let us cheer them on! 💚";
    },
    footer: "🌱 new-creator",
  },
  ACTIVE_CREATOR: {
    color: 0x5865F2,
    emoji: "👟",
    title: "First Sale Unlocked! 💰",
    getDescription: function(member) {
      return "Give it up for " + member + "! 🙌\n\n" +
        "They just made their first sale on Biodance — officially an Active Creator now! 🚀\n\n" +
        "This is where the real journey begins. Keep pushing! 💪";
    },
    footer: "👟 active-creator",
  },
  VIP_CREATOR: {
    color: 0xF0B232,
    emoji: "⭐",
    title: "VIP Status Achieved! 🏆",
    getDescription: function(member) {
      return "🔥 " + member + " just hit VIP status!\n\n" +
        "$500+ GMV — one of our top-performing creators!\n\n" +
        "⭐ Early access to new products & insider trends unlocked\n" +
        "🎯 Reward incoming!\n\n" +
        "Incredible work — VVIP is next! 👑";
    },
    footer: "⭐ vip-creator",
  },
  VVIP_CREATOR: {
    color: 0xE91E63,
    emoji: "👑",
    title: "VVIP Creator! Legend Status! 👑",
    getDescription: function(member) {
      return "👑 " + member + " just reached VVIP! $1,000+ GMV!\n\n" +
        "You are officially one of Biodance elite creators.\n\n" +
        "🏆 First access to everything — launches, campaigns, insider info\n" +
        "🎁 Reward on the way!\n\n" +
        "Thank you for being an incredible part of the Biodance family! 💙";
    },
    footer: "👑 vvip-creator",
  },
};

// 개인 DM 메시지
const DM_MESSAGES = {
  NEW_CREATOR: {
    color: 0x3BA55D,
    title: "Welcome to the Biodance Family! 🌱💙",
    getDescription: function(member) {
      return "Hi " + member + "! 👋\n\n" +
        "We saw your first video — amazing work taking that first step! 🎬\n\n" +
        "You are now part of the **Biodance Creator Community**.\n\n" +
        "📌 Check the pinned messages in **#new-creator** for guidelines\n" +
        "💬 Feel free to ask us anything — we are always here!\n\n" +
        "Can not wait to see you grow! 💚";
    },
    footer: "🌱 Biodance Creator Community",
  },
  ACTIVE_CREATOR: {
    color: 0x5865F2,
    title: "You Made Your First Sale! 💰🎉",
    getDescription: function(member) {
      return "Hi " + member + "! 🎉\n\n" +
        "You just made your first sale — that is HUGE! 🚀\n\n" +
        "You have been moved to the **#active-creator** channel where we share:\n" +
        "📈 Content tips & trending hooks\n" +
        "💡 Strategies to grow your GMV\n\n" +
        "**Next goal:** Hit $500 GMV to unlock ⭐ VIP status!\n\n" +
        "You have got this — we are rooting for you! 💙";
    },
    footer: "👟 Biodance Creator Community",
  },
  VIP_CREATOR: {
    color: 0xF0B232,
    title: "You are a VIP Creator Now! ⭐🏆",
    getDescription: function(member) {
      return "Hi " + member + "! 🌟\n\n" +
        "$500+ GMV — you have officially reached **VIP status**! Incredible! 🔥\n\n" +
        "You now have access to the **#vip-creator** channel with:\n" +
        "✨ Early access to new product launches\n" +
        "📊 Insider content trends & tips\n" +
        "🎯 Exclusive campaign opportunities\n\n" +
        "🎁 Your contest reward is on the way!\n\n" +
        "**Next goal:** Hit $1,000 GMV to unlock 👑 VVIP status!\n\n" +
        "Thank you for being an amazing part of Biodance! 💙";
    },
    footer: "⭐ Biodance Creator Community",
  },
  VVIP_CREATOR: {
    color: 0xE91E63,
    title: "VVIP Status — You are a Legend! 👑✨",
    getDescription: function(member) {
      return "Hi " + member + "! 👑\n\n" +
        "$1,000+ GMV — you have reached the highest tier: **VVIP Creator**! 🎊\n\n" +
        "You now have access to the **#vvip-creator** channel with:\n" +
        "👑 First access to everything — new launches, campaigns, insider info\n" +
        "🎯 Priority for brand collaborations\n" +
        "💎 Exclusive Biodance perks\n\n" +
        "🏆 Your contest reward is on the way!\n\n" +
        "You are truly one of our most valued creators.\n" +
        "Thank you for everything you do for Biodance! 💙";
    },
    footer: "👑 Biodance Creator Community",
  },
};

// 봇 실행
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

client.once("clientReady", async function() {
  console.log("✅ " + client.user.tag + " 봇이 온라인입니다!");
  console.log("📊 서버 " + client.guilds.cache.size + "개에 연결됨");

  // 모든 서버 멤버를 미리 캐싱 (역할 변경 감지에 필수!)
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch();
      console.log("👥 " + guild.name + " 멤버 " + guild.memberCount + "명 캐싱 완료");
    } catch (e) {
      console.log("⚠️ 멤버 캐싱 실패: " + e.message);
    }
  }
});

// 기능 1: 서버 입장 시 DM
client.on("guildMemberAdd", async function(member) {
  try {
    const embed = new EmbedBuilder()
      .setColor(DM_WELCOME.color)
      .setTitle(DM_WELCOME.title)
      .setDescription(DM_WELCOME.description)
      .setFooter({ text: DM_WELCOME.footer })
      .setTimestamp();
    await member.send({ embeds: [embed] });
    console.log("✅ " + member.user.tag + " 입장 DM 전송 완료");
  } catch (error) {
    console.log("⚠️ " + member.user.tag + " DM 전송 실패");
  }
});

// 기능 2: 역할 부여 시 공개 메시지 + 개인 DM
client.on("guildMemberUpdate", async function(oldMember, newMember) {
  try {
    const addedRoles = newMember.roles.cache.filter(
      function(role) { return !oldMember.roles.cache.has(role.id); }
    );
    if (addedRoles.size === 0) return;

    const tierChecks = [
      { roleId: CONFIG.ROLES.VVIP_CREATOR,   channelId: CONFIG.CHANNELS.VVIP_CREATOR,   msgKey: "VVIP_CREATOR" },
      { roleId: CONFIG.ROLES.VIP_CREATOR,    channelId: CONFIG.CHANNELS.VIP_CREATOR,    msgKey: "VIP_CREATOR" },
      { roleId: CONFIG.ROLES.ACTIVE_CREATOR, channelId: CONFIG.CHANNELS.ACTIVE_CREATOR, msgKey: "ACTIVE_CREATOR" },
      { roleId: CONFIG.ROLES.NEW_CREATOR,    channelId: CONFIG.CHANNELS.NEW_CREATOR,    msgKey: "NEW_CREATOR" },
    ];

    for (const tier of tierChecks) {
      if (!tier.roleId) continue;
      if (!addedRoles.has(tier.roleId)) continue;

      // 채널 공개 메시지
      const channel = newMember.guild.channels.cache.get(tier.channelId);
      if (channel) {
        const pubMsg = PUBLIC_MESSAGES[tier.msgKey];
        const pubEmbed = new EmbedBuilder()
          .setColor(pubMsg.color)
          .setTitle(pubMsg.emoji + " " + pubMsg.title)
          .setDescription(pubMsg.getDescription(newMember))
          .setFooter({ text: pubMsg.footer })
          .setTimestamp();
        await channel.send({ embeds: [pubEmbed] });
        console.log("✅ " + newMember.user.tag + " 채널 공개 메시지 전송");
      }

      // 개인 DM
      try {
        const dmMsg = DM_MESSAGES[tier.msgKey];
        const dmEmbed = new EmbedBuilder()
          .setColor(dmMsg.color)
          .setTitle(dmMsg.title)
          .setDescription(dmMsg.getDescription(newMember))
          .setFooter({ text: dmMsg.footer })
          .setTimestamp();
        await newMember.send({ embeds: [dmEmbed] });
        console.log("✅ " + newMember.user.tag + " 개인 DM 전송");
      } catch (dmError) {
        console.log("⚠️ " + newMember.user.tag + " DM 전송 실패");
      }
    }
  } catch (error) {
    console.error("❌ 에러:", error);
  }
});

client.login(CONFIG.TOKEN);
