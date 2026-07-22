const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } = require("discord.js");
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
  CLIENT_ID: process.env.CLIENT_ID,
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
// FAQ 슬래시 커맨드 답변 내용
// 내용 바꾸고 싶으면 여기만 수정!
// ─────────────────────────────────────────
const FAQ = {
  guideline:
    "📍 **Content Guidelines**\n\n" +
    "All guidelines are available in <#1463776258365198564>\n\n" +
    "**Required Hashtags:**\n" +
    "`#biodance` `#skinbooster` `#pdrn` `#antiaging` `#tiktokshopcreatorpicks`\n\n" +
    "Make sure to include these in every video for maximum reach! 🚀",

  campaign:
    "🎯 **Caviar PDRN Serum — Euka Contest Info**\n\n" +
    "📅 **Contest Period:** July 6 – August 28 (PT)\n" +
    "🎬 **Video Upload & GMV Tracking Starts:** July 22\n\n" +
    "⚠️ **Important:**\n" +
    "Only the **Caviar PDRN Serum** counts toward GMV!\n" +
    "Other products will NOT be counted.\n\n" +
    "Keep posting consistently to climb the leaderboard! 💪",

  reward:
    "🏆 **Contest Rewards — 10 Winners Total!**\n\n" +
    "We are giving away massive cash prizes + exclusive PR Boxes:\n\n" +
    "🥇 **Rank 1** — $9,000 Cash + PR Box\n" +
    "🥈 **Rank 2** — $5,000 Cash + PR Box\n" +
    "🥉 **Rank 3** — $4,000 Cash + PR Box\n" +
    "4️⃣ **Rank 4-5** — $2,000 Each + PR Box\n" +
    "5️⃣ **Rank 6-10** — $600 Each + PR Box\n\n" +
    "Keep grinding — every sale counts! 🔥",

  sparkcode:
    "⚡ **How to Submit Your Spark Ad Code**\n\n" +
    "You can submit your Spark Ad Code directly through the **Euka Contest platform**!\n\n" +
    "**Steps:**\n" +
    "1️⃣ Go to your Euka Contest dashboard\n" +
    "2️⃣ Find your submitted video\n" +
    "3️⃣ Submit your Spark Ad Code there\n\n" +
    "If you have any issues submitting, feel free to drop a message here and we will help! 💙",

  samplerequest:
    "🎁 **How to Request a Sample from Biodance**\n\n" +
    "**Option 1 — Check Your Collab Invites (Recommended!)**\n" +
    "We send invitations directly through TikTok Shop!\n" +
    "Please check your **TikTok Shop inbox** — you may already have an invite waiting! 📬\n\n" +
    "**Option 2 — Request via TikTok Shop Creator Center**\n" +
    "1️⃣ Open TikTok → Go to **TikTok Studio**\n" +
    "2️⃣ Tap **Showcase** → **TikTok Shop**\n" +
    "3️⃣ Scroll down to **TikTok Shop Toolkit**\n" +
    "4️⃣ Tap **Manage Samples** → Find Biodance products\n" +
    "5️⃣ Tap **Get Sample** and submit your request\n\n" +
    "⚠️ **Note:** Free samples require at least 1 sale in the last 120 days.\n" +
    "If you do not see the option yet, keep posting and building your GMV first!\n\n" +
    "If you do not see an invitation or have trouble, drop your **TikTok handle** here and we will check for you! 💙",
};

// ─────────────────────────────────────────
// 서버 입장 DM
// ─────────────────────────────────────────
const WELCOME_DM =
  "Hi! So glad you made it over from TikTok! 🎉\n\n" +
  "It's so great to see you here. We are so excited to have you in our official Biodance community! 💙\n\n" +
  "Feel free to spread the word to your creator besties — the more, the merrier! 🙌\n\n" +
  "**One quick thing:** Please set your server nickname to your **TikTok handle** so we can easily find and support you!\n" +
  "*(Right-click your name → Edit Server Profile → Nickname)*\n\n" +
  "Thank you so much for joining us. Let's grow together! 🚀";

// ─────────────────────────────────────────
// 티어별 채널 공개 메시지
// ─────────────────────────────────────────
function newCreatorMsg(mention) {
  return "Welcome " + mention + "! 🌱\n\n" +
    "Thank you for posting your video(s) for Biodance! " +
    "We are super excited to have you here in our space. 🎬💙\n\n" +
    "This channel is your go-to place for:\n" +
    "⚡ Exclusive Content Tips & Strategies to make your next video blow up\n" +
    "🤝 Direct Support from the Biodance team whenever you need help\n\n" +
    "We will help you drive those sales! 💪\n\n" +
    "🧴 New products → <#1463777483664134226>\n" +
    "📍 Content guidelines → <#1463776258365198564>\n\n" +
    "Stay in touch with us here — let's keep growing together! 🌱\n\n" +
    "💡 **Quick tip:** Type `/samplerequest` `/reward` `/campaign` anytime for instant answers!";
}

function activeCreatorMsg(mention) {
  return "Welcome " + mention + "! 👟🎉\n\n" +
    "YOU MADE YOUR FIRST SALE!! We are SO proud of you — " +
    "let's ride this all the way to your reward! 💰🏆\n\n" +
    "We are going to be boosting and supporting you every step of the way. " +
    "Keep posting and let's keep the momentum going! 🚀\n\n" +
    "This channel is your go-to place for:\n" +
    "⚡ Exclusive Content Tips & Strategies to drive major sales\n" +
    "🤝 Direct Support from the Biodance team whenever you need help\n\n" +
    "If you have any questions, drop a message here or DM us anytime. " +
    "We are here to help you succeed! 💙";
}

function vipCreatorMsg(mention) {
  return "🔥 Everyone give it up for " + mention + " — just hit **⭐ VIP status**! ($500+ GMV) 👏\n\n" +
    "One of our top-performing creators — incredible work! 🏆\n\n" +
    "⭐ **VIP perks unlocked:**\n" +
    "✨ Early access to new product info\n" +
    "📊 Insider content trends shared here first\n" +
    "🎁 Your contest reward is on the way!\n\n" +
    "Next stop — VVIP! Keep going! 👑";
}

function vvipCreatorMsg(mention) {
  return "👑 " + mention + " just reached **VVIP status**! ($1,000+ GMV) 🎊\n\n" +
    "Officially one of Biodance elite creators — you are a legend!\n\n" +
    "👑 **VVIP perks:**\n" +
    "🥇 First access to everything — launches, campaigns, insider info\n" +
    "🎁 Your contest reward is on the way!\n\n" +
    "Thank you for being such an incredible part of the Biodance family! 💙";
}

// ─────────────────────────────────────────
// 슬래시 커맨드 등록
// ─────────────────────────────────────────
const commands = [
  new SlashCommandBuilder().setName("guideline").setDescription("View Biodance content guidelines & required hashtags"),
  new SlashCommandBuilder().setName("campaign").setDescription("View current contest period and product info"),
  new SlashCommandBuilder().setName("reward").setDescription("View contest reward structure"),
  new SlashCommandBuilder().setName("sparkcode").setDescription("Learn how to submit your Spark Ad Code"),
  new SlashCommandBuilder().setName("samplerequest").setDescription("Learn how to request a free sample from Biodance"),
].map(function(cmd) { return cmd.toJSON(); });

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

  // 슬래시 커맨드 등록
  try {
    const rest = new REST({ version: "10" }).setToken(CONFIG.TOKEN);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("✅ 슬래시 커맨드 등록 완료!");
  } catch (e) {
    console.error("❌ 슬래시 커맨드 등록 실패:", e);
  }

  // 멤버 캐싱
  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch();
      console.log("👥 " + guild.name + " 멤버 " + guild.memberCount + "명 캐싱 완료");
    } catch (e) {
      console.log("⚠️ 멤버 캐싱 실패: " + e.message);
    }
  }
});

// 기능 1: 서버 입장 시 개인 DM
client.on("guildMemberAdd", async function(member) {
  try {
    await member.send(WELCOME_DM);
    console.log("✅ " + member.user.tag + " 입장 DM 전송 완료");
  } catch (error) {
    console.log("⚠️ " + member.user.tag + " DM 전송 실패");
  }
});

// 기능 2: 역할 부여 시 채널 공개 메시지
client.on("guildMemberUpdate", async function(oldMember, newMember) {
  try {
    const addedRoles = newMember.roles.cache.filter(
      function(role) { return !oldMember.roles.cache.has(role.id); }
    );
    if (addedRoles.size === 0) return;

    const tierChecks = [
      { roleId: CONFIG.ROLES.VVIP_CREATOR,   channelId: CONFIG.CHANNELS.VVIP_CREATOR,   msgFn: vvipCreatorMsg },
      { roleId: CONFIG.ROLES.VIP_CREATOR,    channelId: CONFIG.CHANNELS.VIP_CREATOR,    msgFn: vipCreatorMsg },
      { roleId: CONFIG.ROLES.ACTIVE_CREATOR, channelId: CONFIG.CHANNELS.ACTIVE_CREATOR, msgFn: activeCreatorMsg },
      { roleId: CONFIG.ROLES.NEW_CREATOR,    channelId: CONFIG.CHANNELS.NEW_CREATOR,    msgFn: newCreatorMsg },
    ];

    for (const tier of tierChecks) {
      if (!tier.roleId) continue;
      if (!addedRoles.has(tier.roleId)) continue;

      const channel = newMember.guild.channels.cache.get(tier.channelId);
      if (!channel) continue;

      const mention = "<@" + newMember.id + ">";
      await channel.send({ content: tier.msgFn(mention) });
      console.log("✅ " + newMember.user.tag + " 채널 메시지 전송");
    }
  } catch (error) {
    console.error("❌ 에러:", error);
  }
});

// 기능 3: FAQ 슬래시 커맨드 응답
client.on("interactionCreate", async function(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const responses = {
    "guideline":      FAQ.guideline,
    "campaign":       FAQ.campaign,
    "reward":         FAQ.reward,
    "sparkcode":      FAQ.sparkcode,
    "samplerequest":  FAQ.samplerequest,
  };

  const response = responses[interaction.commandName];
  if (response) {
    await interaction.reply({ content: response });
    console.log("✅ /" + interaction.commandName + " 커맨드 응답 완료");
  }
});

client.login(CONFIG.TOKEN);
