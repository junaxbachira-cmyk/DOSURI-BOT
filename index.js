const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const express = require("express");

const db = new QuickDB();
const app = express();

app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("Web server aktif"));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = "MTQ3MzM2NDcyMTg5NjkxOTA1Nw.G9-KSf.2qMeyJiqjILsFd2UXDVYr165j1H0BLKowS0U3s";

/* ================= LEVEL SYSTEM ================= */

function xpNeed(level) {
  return level * 150;
}

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const user = message.author.id;
  const guild = message.guild.id;

  let xp = await db.get(`xp_${guild}_${user}`) || 0;
  let level = await db.get(`level_${guild}_${user}`) || 1;

  xp += 5;
  await db.set(`xp_${guild}_${user}`, xp);

  if (xp >= xpNeed(level)) {
    level++;
    xp = 0;

    await db.set(`level_${guild}_${user}`, level);
    await db.set(`xp_${guild}_${user}`, xp);

    message.channel.send(`🎉 ${message.author} naik ke level ${level}!`);
  }
});

/* ================= POKEMON DATA ================= */

const pokemons = {
  Common: [{ name: "Pikachu", hp: 80, atk: 15 }],
  Rare: [{ name: "Charmeleon", hp: 100, atk: 20 }],
  Epic: [{ name: "Gengar", hp: 120, atk: 30 }],
  Legendary: [{ name: "Mewtwo", hp: 150, atk: 45 }]
};

function getRarity() {
  let r = Math.random() * 100;
  if (r < 60) return "Common";
  if (r < 85) return "Rare";
  if (r < 95) return "Epic";
  return "Legendary";
}

function progressBar(percent) {
  const total = 10;
  const filled = Math.floor(percent / 10);
  return "█".repeat(filled) + "░".repeat(total - filled);
}

/* ================= COMMAND ================= */

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.split(" ");
  const cmd = args[0];

  /* LEVEL */
  if (cmd === "!level") {
    let level = await db.get(`level_${message.guild.id}_${message.author.id}`) || 1;
    let xp = await db.get(`xp_${message.guild.id}_${message.author.id}`) || 0;
    return message.reply(`Level: ${level}\nXP: ${xp}/${xpNeed(level)}`);
  }

  /* DAILY */
  if (cmd === "!daily") {
    let coins = await db.get(`coin_${message.author.id}`) || 0;
    coins += 1000;
    await db.set(`coin_${message.author.id}`, coins);
    return message.reply("💰 +1000 Coin!");
  }

  /* SLOT */
  if (cmd === "!slot") {
    const emojis = ["🍒","🍋","🍉","💎","⭐"];
    let msg = await message.channel.send("🎰 Rolling...");

    function roll() {
      return emojis[Math.floor(Math.random() * emojis.length)];
    }

    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 1000));
      await msg.edit(`🎰 | ${roll()} ${roll()} ${roll()}`);
    }

    return msg.edit("🎉 SLOT SELESAI!");
  }

  /* GACHA */
  if (cmd === "!gacha") {

    let msg = await message.channel.send("🎁 Membuka PokéBall...\n`░░░░░░░░░░ 0%`");

    for (let i = 1; i <= 5; i++) {
      await new Promise(r => setTimeout(r, 800));
      let percent = i * 20;
      await msg.edit(`🎁 Membuka PokéBall...\n\`${progressBar(percent)} ${percent}%\``);
    }

    let rarity = getRarity();
    let poke = pokemons[rarity][0];

    let userPoke = await db.get(`pokemon_${message.author.id}`) || [];
    userPoke.push({ ...poke, rarity });
    await db.set(`pokemon_${message.author.id}`, userPoke);

    if (rarity === "Legendary") {
      const embed = new EmbedBuilder()
        .setTitle("🌟 LEGENDARY POKÉMON!")
        .setDescription(`🔥 ${poke.name} muncul dengan cahaya luar biasa!`)
        .setImage("https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif")
        .setColor("Gold");

      return msg.edit({ content: "⚡ LEGENDARY DROP! ⚡", embeds: [embed] });
    }

    return msg.edit(`✨ Kamu dapat ${rarity} - ${poke.name}`);
  }

  /* LIST POKEMON */
  if (cmd === "!pokemon") {
    let list = await db.get(`pokemon_${message.author.id}`) || [];
    if (!list.length) return message.reply("Belum punya Pokémon!");
    let text = list.map((p,i)=>`${i+1}. ${p.name} (${p.rarity})`).join("\n");
    return message.reply(text);
  }

  /* BATTLE */
  if (cmd === "!pbattle") {

    let opponent = message.mentions.users.first();
    if (!opponent) return message.reply("Tag lawan!");

    let myPoke = (await db.get(`pokemon_${message.author.id}`))?.[0];
    let enemyPoke = (await db.get(`pokemon_${opponent.id}`))?.[0];

    if (!myPoke || !enemyPoke) return message.reply("Salah satu belum punya Pokémon!");

    let myHP = myPoke.hp;
    let enemyHP = enemyPoke.hp;

    while (myHP > 0 && enemyHP > 0) {
      enemyHP -= myPoke.atk;
      if (enemyHP <= 0) break;
      myHP -= enemyPoke.atk;
    }

    if (myHP > 0) {
      return message.channel.send(`🏆 ${message.author} menang!`);
    } else {
      return message.channel.send(`💀 ${opponent} menang!`);
    }
  }
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(TOKEN);
