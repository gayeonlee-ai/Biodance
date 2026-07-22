const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } = require("discord.js");
const http = require("http");

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Biodance Bot is running!");
}).listen(PORT, "0.0.0.0", () => {
  console.log("웹서버가 포트 " + PORT + "에서 실행 중");
});

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

const FAQ = {
  guideline:
    "📍 **Biodance Content Guidelines**\n\n" +
    "Hello! Before you start creating, here is everything you need to know 💙\n\n" +
    "Full guidelines → <#1463776258365198564>\n" +
    "We update this regularly, so bookmark it!\n\n" +
    "Take a look at the keywords and content direction in the guideline channel — " +
    "use them as inspiration to create content that feels natural to you while hitting the right notes for the algorithm! ✨\n\n" +
    "**Required Hashtags — include ALL of these in every video:**\n" +
    "`#biodance` `#skinbooster` `#pdrn` `#antiaging` `#tiktokshopcreatorpicks`\n\n" +
    "**Quick Content Tips:**\n" +
    "✅ Hook within the first 2-3 seconds — make them stop scrolling\n" +
    "✅ Show the texture, the before/after, the real skin results\n" +
    "✅ Be authentic — your audience trusts YOU, not a script\n" +
    "✅ Always add the product link in your video\n\n" +
    "If you ever have questions, just drop a message here — we are always happy to help! 💬",

  campaign:
    "🎯 **Caviar PDRN Serum — Euka GMV Contest**\n\n" +
    "Hello! This is THE moment. Here is everything you need to know 👇\n\n" +
    "📅 **Contest Period:** July 6 – August 28 (PT)\n" +
    "🎬 **GMV Tracking Starts:** July 22\n" +
    "Videos uploaded before July 22 count, but GMV only tracks from July 22!\n\n" +
    "🧴 **Hero Product:** Caviar PDRN Serum — this product ONLY\n\n" +
    "⚠️ Other Biodance products will NOT count toward your contest GMV. " +
    "Make sure every video is linked to the Caviar PDRN Serum specifically!\n\n" +
    "The earlier you start, the more time you have to build GMV. " +
    "Consistency is everything — even 1-2 videos a day adds up fast! 🚀\n\n" +
    "Questions about the contest? Drop them here and we will answer ASAP 💙",

  reward:
    "🏆 **Contest Rewards — 10 Winners, Huge Prizes!**\n\n" +
    "Hello! We are not playing around with this one 👀 Here is what is up for grabs:\n\n" +
    "🥇 **1st Place** — **$9,000** Cash + Exclusive PR Box\n" +
    "🥈 **2nd Place** — **$5,000** Cash + Exclusive PR Box\n" +
    "🥉 **3rd Place** — **$4,000** Cash + Exclusive PR Box\n" +
    "4️⃣ **4th & 5th Place** — **$2,000 each** + Exclusive PR Box\n" +
    "5️⃣ **6th-10th Place** — **$600 each** + Exclusive PR Box\n\n" +
    "**Total Prize Pool: $25,000+** 💸\n\n" +
    "Every single video you post is a chance to climb the leaderboard. " +
    "Do not wait — start posting NOW and let us help you get there! 🔥\n\n" +
    "Rewards are based on GMV generated from the Caviar PDRN Serum only, tracked July 22 – August 28.",

  sparkcode:
    "⚡ **How to Submit Your Spark Ad Code**\n\n" +
    "Hello! Great news — it is super simple! Here is how:\n\n" +
    "1️⃣ Go to your **Euka Contest dashboard**\n" +
    "2️⃣ Find the video you want to boost\n" +
    "3️⃣ Submit your **Spark Ad Code** directly there\n\n" +
    "**Why does this matter?**\n" +
    "When we boost your video with Spark Ads, it reaches WAY more people — " +
    "which means more views, more conversions, and more GMV for YOU! " +
    "So please submit your code as soon as your video is live 🙏\n\n" +
    "Having trouble finding your Spark Ad Code? Drop your TikTok handle here and we will walk you through it! 💙",

  samplerequest:
    "🎁 **How to Request a Biodance Sample**\n\n" +
    "Hello! We love getting our products into your hands so you can create the most authentic content possible! 💙\n\n" +
    "**Step 1 — Check your TikTok Shop Inbox first! 📬**\n" +
    "We send collab invitations directly through TikTok Shop. " +
    "You might already have one waiting! Open TikTok → Inbox → TikTok Shop notifications\n\n" +
    "**Step 2 — Request via Creator Center (if no invite yet)**\n" +
    "1️⃣ Open TikTok → **TikTok Studio**\n" +
    "2️⃣ Tap **Showcase → TikTok Shop**\n" +
    "3️⃣ Scroll to **TikTok Shop Toolkit → Manage Samples**\n" +
    "4️⃣ Search for **Biodance** → tap **Get Sample**\n" +
    "5️⃣ Submit your request!\n\n" +
    "⚠️ The free sample option requires at least 1 sale in the last 120 days. " +
    "If you do not see it yet, keep posting — once you make your first sale, it unlocks!\n\n" +
    "Do not see an invite or having trouble? Drop your **TikTok handle** right here and we will personally send one over! 💙",

  newproduct:
    "✨ **New Products & Product Info**\n\n" +
    "Hello! Curious about our latest products and what makes them special? 💙\n\n" +
    "Check out all the product details here → <#1463777483664134226>\n" +
    "You will find key ingredients, product highlights, and everything you need to know!\n\n" +
    "Before you start creating content, head over to <#1463776258365198564> for the content guidelines — " +
    "follow the direction there so your videos hit all the right points! ✨\n\n" +
    "If you have any specific questions about the products, feel free to ask us here — we are always here to help! 💬",
};

const WELCOME_DM =
  "Hi! So glad you made it over from TikTok! 🎉\n\n" +
  "It's so great to see you here. We are so excited to have you in our official Biodance community! 💙\n\n" +
  "Feel free to spread the word to your creator besties — the more, the merrier! 🙌\n\n" +
  "One quick thing: Please set your server nickname to your **TikTok handle** so we can easily find and support you!\n" +
  "Right-click your name → Edit Server Profile → Nickname\n\n" +
  "Thank you so much for joining us. Let's grow together! 🚀";

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
    "💡 Tip: Type /samplerequest /reward /campaign anytime for instant answers!";
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

const commands = [
  new SlashCommandBuilder().setName("guideline").setDescription("View Biodance content guidelines & required hashtags"),
  new SlashCommandBuilder().setName("campaign").setDescription("View current contest period and product info"),
  new SlashCommandBuilder().setName("reward").setDescription("View contest reward structure"),
  new SlashCommandBuilder().setName("sparkcode").setDescription("Learn how to submit your Spark Ad Code"),
  new SlashCommandBuilder().setName("samplerequest").setDescription("Learn how to request a free sample from Biodance"),
  new SlashCommandBuilder().setName("newproduct").setDescription("Check out Biodance new products and product info"),
].map(function(cmd) { return cmd.toJSON(); });

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

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.members.fetch();
      console.log("👥 " + guild.name + " 멤버 " + guild.memberCount + "명 캐싱 완료");
    } catch (e) {
      console.log("⚠️ 멤버 캐싱 실패: " + e.message);
    }
  }
});

client.on("guildMemberAdd", async function(member) {
  try {
    await member.send(WELCOME_DM);
    console.log("✅ " + member.user.tag + " 입장 DM 전송 완료");
  } catch (error) {
    console.log("⚠️ " + member.user.tag + " DM 전송 실패");
  }
});

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

client.on("interactionCreate", async function(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const responses = {
    "guideline":     FAQ.guideline,
    "campaign":      FAQ.campaign,
    "reward":        FAQ.reward,
    "sparkcode":     FAQ.sparkcode,
    "samplerequest": FAQ.samplerequest,
    "newproduct":    FAQ.newproduct,
  };

  const response = responses[interaction.commandName];
  if (response) {
    await interaction.reply({ content: response });
    console.log("✅ /" + interaction.commandName + " 커맨드 응답 완료");
  }
});

client.login(CONFIG.TOKEN);
