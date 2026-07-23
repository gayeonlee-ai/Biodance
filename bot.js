const { Client, GatewayIntentBits, EmbedBuilder, Partials, REST, Routes, SlashCommandBuilder } = require("discord.js");
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

// ─── FAQ 슬래시 커맨드 (Embed 카드형) ───

function faqGuideline() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("📍 Biodance Content Guidelines")
    .setDescription(
      "Hello! Before you start creating, here is everything you need to know 💙\n\n" +
      "**Full guidelines** → <#1463776258365198564>\n" +
      "We update this regularly, so bookmark it!\n\n" +
      "Take a look at the keywords and content direction in the guideline channel — " +
      "use them as inspiration to create content that feels natural to you! ✨\n\n" +
      "**Required Hashtags — include ALL of these:**\n" +
      "`#biodance` `#skinbooster` `#pdrn` `#antiaging` `#tiktokshopcreatorpicks`"
    )
    .addFields({
      name: "Quick Content Tips",
      value:
        "✅ Hook within the first 2-3 seconds\n" +
        "✅ Show the texture, before/after, real results\n" +
        "✅ Be authentic — your audience trusts YOU\n" +
        "✅ Always add the product link in your video"
    })
    .setFooter({ text: "Questions? Just ask us here 💬" });
}

function faqCampaign() {
  return new EmbedBuilder()
    .setColor(0xF0B232)
    .setTitle("🎯 Caviar PDRN Serum — Euka GMV Contest")
    .setDescription(
      "Hello! This is THE moment. Here is everything you need to know 👇"
    )
    .addFields(
      { name: "📅 Contest Period", value: "July 6 – August 28 (PT)", inline: true },
      { name: "🎬 GMV Tracking Starts", value: "July 22", inline: true },
      { name: "🧴 Hero Product", value: "**Caviar PDRN Serum ONLY**\nOther products will NOT count!", inline: false }
    )
    .setFooter({ text: "Consistency is everything — even 1-2 videos a day adds up fast! 🚀" });
}

function faqReward() {
  return new EmbedBuilder()
    .setColor(0xE91E63)
    .setTitle("🏆 Contest Rewards — 10 Winners, Huge Prizes!")
    .setDescription(
      "Hello! We are not playing around with this one 👀"
    )
    .addFields(
      { name: "🥇 1st Place", value: "$9,000 Cash + PR Box", inline: true },
      { name: "🥈 2nd Place", value: "$5,000 Cash + PR Box", inline: true },
      { name: "🥉 3rd Place", value: "$4,000 Cash + PR Box", inline: true },
      { name: "4️⃣ 4th & 5th", value: "$2,000 each + PR Box", inline: true },
      { name: "5️⃣ 6th-10th", value: "$600 each + PR Box", inline: true },
      { name: "💸 Total Prize Pool", value: "**$25,000+**", inline: true }
    )
    .setFooter({ text: "Based on Caviar PDRN Serum GMV only (July 22 – Aug 28) 🔥" });
}

function faqSparkcode() {
  return new EmbedBuilder()
    .setColor(0x3BA55D)
    .setTitle("⚡ How to Submit Your Spark Ad Code")
    .setDescription(
      "Hello! Great news — it is super simple!"
    )
    .addFields(
      { name: "Steps", value:
        "1️⃣ Go to your **Euka Contest dashboard**\n" +
        "2️⃣ Find the video you want to boost\n" +
        "3️⃣ Submit your **Spark Ad Code** directly there"
      },
      { name: "Why does this matter?", value:
        "When we boost your video with Spark Ads, it reaches WAY more people — " +
        "more views, more conversions, more GMV for YOU! 🚀"
      }
    )
    .setFooter({ text: "Need help? Drop your TikTok handle here 💙" });
}

function faqSampleRequest() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🎁 How to Request a Biodance Sample")
    .setDescription(
      "Hello! We love getting our products into your hands! 💙"
    )
    .addFields(
      { name: "Step 1 — Check your Inbox first! 📬", value:
        "We send collab invitations through TikTok Shop.\n" +
        "Open TikTok → Inbox → TikTok Shop notifications"
      },
      { name: "Step 2 — Request via Creator Center", value:
        "1️⃣ TikTok → **TikTok Studio**\n" +
        "2️⃣ **Showcase → TikTok Shop**\n" +
        "3️⃣ **TikTok Shop Toolkit → Manage Samples**\n" +
        "4️⃣ Search **Biodance** → tap **Get Sample**"
      },
      { name: "⚠️ Heads up", value:
        "Free samples require at least 1 sale in the last 120 days.\n" +
        "Do not see it yet? Keep posting — it unlocks after your first sale!"
      }
    )
    .setFooter({ text: "Having trouble? Drop your TikTok handle here and we will send one over! 💙" });
}

function faqNewProduct() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("✨ New Products & Product Info")
    .setDescription(
      "Hello! Curious about our latest products? 💙\n\n" +
      "Check out all the details here → <#1463777483664134226>\n" +
      "You will find key ingredients, highlights, and everything you need!\n\n" +
      "Before creating content, head to <#1463776258365198564> for guidelines — " +
      "follow the direction there so your videos hit all the right points! ✨"
    )
    .setFooter({ text: "Questions about the products? Ask us here 💬" });
}

// ─── 서버 입장 DM (Embed 카드형) ───

function welcomeDmEmbed() {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("Welcome to Biodance Global! 💙")
    .setDescription(
      "Hi! So glad you made it over from TikTok! 🎉\n\n" +
      "We are so excited to have you in our official Biodance community!\n\n" +
      "Feel free to spread the word to your creator besties — the more, the merrier! 🙌"
    )
    .addFields(
      { name: "📝 One quick thing!", value:
        "Please set your server nickname to your **TikTok handle** so we can easily find and support you!\n" +
        "Right-click your name → Edit Server Profile → Nickname"
      }
    )
    .setFooter({ text: "Thank you for joining us. Let's grow together! 🚀" });
}

// ─── 티어별 채널 환영 메시지 (Embed 카드형) ───

function newCreatorEmbed(mention) {
  return new EmbedBuilder()
    .setColor(0x3BA55D)
    .setTitle("🌱 Welcome to Biodance!")
    .setDescription(
      "Hello " + mention + "!\n\n" +
      "Thank you for posting your video(s) for Biodance! " +
      "We are super excited to have you here 🎬💙"
    )
    .addFields(
      { name: "This channel is your go-to place for", value:
        "⚡ Exclusive Content Tips & Strategies\n" +
        "🤝 Direct Support from the Biodance team"
      },
      { name: "Helpful Links", value:
        "🧴 New products → <#1463777483664134226>\n" +
        "📍 Content guidelines → <#1463776258365198564>"
      }
    )
    .setFooter({ text: "💡 Use our slash commands for instant info! /newproduct /guideline /sparkcode /samplerequest /reward /campaign" });
}

function activeCreatorEmbed(mention) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("👟 First Sale Unlocked!")
    .setDescription(
      "Hello " + mention + "!\n\n" +
      "YOU MADE YOUR FIRST SALE!! We are SO proud of you 💰🎉\n\n" +
      "Let's ride this all the way to your reward! " +
      "We are going to be boosting and supporting you every step of the way 🚀"
    )
    .addFields(
      { name: "This channel is your go-to place for", value:
        "⚡ Exclusive Content Tips & Strategies to drive major sales\n" +
        "🤝 Direct Support from the Biodance team"
      }
    )
    .setFooter({ text: "Questions? Drop a message here or DM us anytime 💙" });
}

function vipCreatorEmbed(mention) {
  return new EmbedBuilder()
    .setColor(0xF0B232)
    .setTitle("⭐ VIP Status Achieved!")
    .setDescription(
      "🔥 Everyone give it up for " + mention + "!\n\n" +
      "$500+ GMV — one of our top-performing creators! 🏆"
    )
    .addFields(
      { name: "⭐ VIP perks unlocked", value:
        "✨ Early access to new product info\n" +
        "📊 Insider content trends shared here first\n" +
        "🎁 Your contest reward is on the way!"
      }
    )
    .setFooter({ text: "Next stop — VVIP! Keep going! 👑" });
}

function vvipCreatorEmbed(mention) {
  return new EmbedBuilder()
    .setColor(0xE91E63)
    .setTitle("👑 VVIP — Legend Status!")
    .setDescription(
      mention + " just reached VVIP! $1,000+ GMV! 🎊\n\n" +
      "Officially one of Biodance elite creators — you are a legend!"
    )
    .addFields(
      { name: "👑 VVIP perks", value:
        "🥇 First access to everything — launches, campaigns, insider info\n" +
        "🎁 Your contest reward is on the way!"
      }
    )
    .setFooter({ text: "Thank you for being an incredible part of the Biodance family! 💙" });
}

// ─── 슬래시 커맨드 등록 ───

const commands = [
  new SlashCommandBuilder().setName("guideline").setDescription("View Biodance content guidelines & required hashtags"),
  new SlashCommandBuilder().setName("campaign").setDescription("View current contest period and product info"),
  new SlashCommandBuilder().setName("reward").setDescription("View contest reward structure"),
  new SlashCommandBuilder().setName("sparkcode").setDescription("Learn how to submit your Spark Ad Code"),
  new SlashCommandBuilder().setName("samplerequest").setDescription("Learn how to request a free sample from Biodance"),
  new SlashCommandBuilder().setName("newproduct").setDescription("Check out Biodance new products and product info"),
].map(function(cmd) { return cmd.toJSON(); });

// ─── 봇 실행 ───

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

// 기능 1: 서버 입장 시 개인 DM
client.on("guildMemberAdd", async function(member) {
  try {
    await member.send({ embeds: [welcomeDmEmbed()] });
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
      { roleId: CONFIG.ROLES.VVIP_CREATOR,   channelId: CONFIG.CHANNELS.VVIP_CREATOR,   embedFn: vvipCreatorEmbed },
      { roleId: CONFIG.ROLES.VIP_CREATOR,    channelId: CONFIG.CHANNELS.VIP_CREATOR,    embedFn: vipCreatorEmbed },
      { roleId: CONFIG.ROLES.ACTIVE_CREATOR, channelId: CONFIG.CHANNELS.ACTIVE_CREATOR, embedFn: activeCreatorEmbed },
      { roleId: CONFIG.ROLES.NEW_CREATOR,    channelId: CONFIG.CHANNELS.NEW_CREATOR,    embedFn: newCreatorEmbed },
    ];

    for (const tier of tierChecks) {
      if (!tier.roleId) continue;
      if (!addedRoles.has(tier.roleId)) continue;

      const channel = newMember.guild.channels.cache.get(tier.channelId);
      if (!channel) continue;

      const mention = "<@" + newMember.id + ">";
      await channel.send({ embeds: [tier.embedFn(mention)] });
      console.log("✅ " + newMember.user.tag + " 채널 메시지 전송");
    }
  } catch (error) {
    console.error("❌ 에러:", error);
  }
});

// 기능 3: FAQ 슬래시 커맨드 응답
client.on("interactionCreate", async function(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const embedMap = {
    "guideline":     faqGuideline,
    "campaign":      faqCampaign,
    "reward":        faqReward,
    "sparkcode":     faqSparkcode,
    "samplerequest": faqSampleRequest,
    "newproduct":    faqNewProduct,
  };

  const embedFn = embedMap[interaction.commandName];
  if (embedFn) {
    await interaction.reply({ embeds: [embedFn()] });
    console.log("✅ /" + interaction.commandName + " 커맨드 응답 완료");
  }
});

client.login(CONFIG.TOKEN);
