const { Client, GatewayIntentBits, Partials } = require("discord.js");
const http = require("http");

// Render 무료 플랜용 웹서버
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Biodance Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
  console.log("웹서버가 포트 " + PORT + "에서 실행 중");
});

// ─────────────────────────────────────────
// 설정
// ─────────────────────────────────────────
const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN,
  ROLES: {
    NEW_CREATOR:    "1528676082868555857",
    ACTIVE_CREATOR: "1528676173914046525",
    VIP_CREATOR:    "1528676224342425720",
    VVIP_CREATOR:   "",
  },
  CHANNELS: {
    NEW_CREATOR:    "1525810100470677555",
    ACTIVE_CREATOR: "1525809411841589348",
    VIP_CREATOR:    "1525809262117257376",
    VVIP_CREATOR:   "",
    NEW_PRODUCTS:   "1463777483664134226",
    GUIDELINES:     "1463776258365198564",
  },
};

// ─────────────────────────────────────────
// 기능 2: 승인(서버 입장) 시 → 개인 DM
// ─────────────────────────────────────────
const WELCOME_DM =
  "Hi! So glad you made it over from TikTok! 🎉\n\n" +
  "It's so great to see you here. We are so excited to have you in our official Biodance community! 💙\n\n" +
  "Also, feel free to spread the word to your creator besties — the more, the merrier! 🙌\n\n" +
  "Thank you so much for joining us. Let's grow together! 🚀";

// ─────────────────────────────────────────
// 기능 3: 🌱 new-creator 역할 부여 시 → 채널 공개 메시지
// ─────────────────────────────────────────
function newCreatorMsg(mention, video_ch, guide_ch) {
  return "Welcome " + mention + "! 🌱\n\n" +
    "Thank you for posting your video(s) for Biodance! " +
    "We are super excited to have you here in our space. 🎬💙\n\n" +
    "This channel is your go-to place for:\n" +
    "⚡ Exclusive Content Tips & Strategies to make your next video blow up\n" +
    "🤝 Direct Support from the Biodance team whenever you need help\n\n" +
    "We will help you drive those sales! 💪\n\n" +
    "If you ever have questions or need support with your content, " +
    "feel free to drop a message in this chat or DM us anytime. " +
    "We are here to help you succeed!\n\n" +
    "🧴 New products → <#" + video_ch + ">\n" +
    "📍 Content guidelines → <#" + guide_ch + ">\n\n" +
    "Stay in touch with us here — let's keep growing together! 🌱";
}

// ─────────────────────────────────────────
// 기능 4: 👟 active-creator 역할 부여 시 → 채널 공개 메시지
// ─────────────────────────────────────────
function activeCreatorMsg(mention) {
  return "Welcome " + mention + "! 👟🎉\n\n" +
    "YOU MADE YOUR FIRST SALE!! We are SO proud of you — " +
    "let's ride this all the way to your reward! 💰🏆\n\n" +
    "We are going to be boosting and supporting you every step of the way. " +
    "Keep posting and let's keep the momentum going! 🚀\n\n" +
    "This channel is your go-to place for:\n" +
    "⚡ Exclusive Content Tips & Strategies to drive major sales\n" +
    "🤝 Direct Support from the Biodance team whenever you need help\n\n" +
    "If you ever have questions or need support with your content, " +
    "feel free to drop a message in this chat or DM us anytime. " +
    "We are here to help you succeed! 💙";
}

// ─────────────────────────────────────────
// VIP 메시지 (기존 유지)
// ─────────────────────────────────────────
function vipCreatorMsg(mention) {
  return "🔥 Everyone give it up for " + mention + " — just hit **⭐ VIP status**! ($500+ GMV) 👏\n\n" +
    "One of our top-performing creators — incredible work! 🏆\n\n" +
    "⭐ VIP perks unlocked:\n" +
    "✨ Early access to new product info\n" +
    "📊 Insider content trends shared here first\n" +
    "🎁 Your contest reward is on the way!\n\n" +
    "Next stop — VVIP! Keep going! 👑";
}

function vvipCreatorMsg(mention) {
  return "👑 " + mention + " just reached **VVIP status**! ($1,000+ GMV) 🎊\n\n" +
    "Officially one of Biodance elite creators — you are a legend!\n\n" +
    "👑 VVIP perks:\n" +
    "🥇 First access to everything — launches, campaigns, insider info\n" +
    "🎁 Your contest reward is on the way!\n\n" +
    "Thank you for being such an incredible part of the Biodance family! 💙";
}

// ─────────────────────────────────────────
// 봇 실행
// ─────────────────────────────────────────
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
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch();
      console.log("👥 " + guild.name + " 멤버 " + guild.memberCount + "명 캐싱 완료");
    } catch (e) {
      console.log("⚠️ 멤버 캐싱 실패: " + e.message);
    }
  }
});

// 기능 2: 서버 승인(입장) 시 개인 DM
client.on("guildMemberAdd", async function(member) {
  try {
    await member.send(WELCOME_DM);
    console.log("✅ " + member.user.tag + " 입장 DM 전송 완료");
  } catch (error) {
    console.log("⚠️ " + member.user.tag + " DM 전송 실패 (DM 꺼져있음)");
  }
});

// 기능 3, 4: 역할 부여 시 채널 공개 메시지
client.on("guildMemberUpdate", async function(oldMember, newMember) {
  try {
    const addedRoles = newMember.roles.cache.filter(
      function(role) { return !oldMember.roles.cache.has(role.id); }
    );
    if (addedRoles.size === 0) return;

    const tierChecks = [
      { roleId: CONFIG.ROLES.VVIP_CREATOR,   channelId: CONFIG.CHANNELS.VVIP_CREATOR,   msgKey: "VVIP" },
      { roleId: CONFIG.ROLES.VIP_CREATOR,    channelId: CONFIG.CHANNELS.VIP_CREATOR,    msgKey: "VIP" },
      { roleId: CONFIG.ROLES.ACTIVE_CREATOR, channelId: CONFIG.CHANNELS.ACTIVE_CREATOR, msgKey: "ACTIVE" },
      { roleId: CONFIG.ROLES.NEW_CREATOR,    channelId: CONFIG.CHANNELS.NEW_CREATOR,    msgKey: "NEW" },
    ];

    for (const tier of tierChecks) {
      if (!tier.roleId) continue;
      if (!addedRoles.has(tier.roleId)) continue;

      const channel = newMember.guild.channels.cache.get(tier.channelId);
      if (!channel) {
        console.error("❌ 채널 없음: " + tier.channelId);
        continue;
      }

      const mention = "<@" + newMember.id + ">";
      let msg = "";

      if (tier.msgKey === "NEW") {
        msg = newCreatorMsg(mention, CONFIG.CHANNELS.NEW_PRODUCTS, CONFIG.CHANNELS.GUIDELINES);
      } else if (tier.msgKey === "ACTIVE") {
        msg = activeCreatorMsg(mention);
      } else if (tier.msgKey === "VIP") {
        msg = vipCreatorMsg(mention);
      } else if (tier.msgKey === "VVIP") {
        msg = vvipCreatorMsg(mention);
      }

      await channel.send({ content: msg });
      console.log("✅ " + newMember.user.tag + " → " + tier.msgKey + " 메시지 전송");
    }
  } catch (error) {
    console.error("❌ 에러:", error);
  }
});

client.login(CONFIG.TOKEN);
