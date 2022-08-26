const merge = require("deepmerge");
const serialize = require("serialize-javascript");
const { EventEmitter } = require("events");

class Giveaway extends EventEmitter {
  constructor(manager, options) {
    super();
    this.manager = manager;
    this.client = manager.client;
    this.prize = options.prize;
    this.startAt = options.startAt;
    this.endAt = options.endAt;
    this.ended = options.ended;
    this.channelID = options.channelID;
    this.messageID = options.messageID;
    this.guildID = options.guildID;
    this.winnerCount = options.winnerCount;
    this.winnerIDs = options.winnerIDs;
    this.hostedBy = options.hostedBy;
    this.messages = options.messages;
    this.extraData = options.extraData;
    this.options = options;
    this.message = null;
  }

  get messageURL() {
    return `https://discord.com/channels/${this.guildID}/${this.channelID}/${this.messageID}`;
  }

  get remainingTime() {
    return this.endAt - Date.now();
  }

  get giveawayDuration() {
    return this.endAt - this.startAt;
  }

  get embedColor() {
    return this.options.embedColor || this.manager.options.default.embedColor;
  }

  get embedColorEnd() {
    return (
      this.options.embedColorEnd || this.manager.options.default.embedColorEnd
    );
  }

  get reaction() {
    return this.options.reaction || this.manager.options.default.reaction;
  }

  get botsCanWin() {
    return this.options.botsCanWin || this.manager.options.default.botsCanWin;
  }

  get exemptPermissions() {
    return Array.isArray(this.options.exemptPermissions) &&
      this.options.exemptPermissions.length
      ? this.options.exemptPermissions
      : this.manager.options.default.exemptPermissions;
  }

  get lastChance() {
    return this.options.lastChance || this.manager.options.default.lastChance;
  }

  get bonusEntries() {
    const validBonusEntries = eval(this.options.bonusEntries);
    return Array.isArray(validBonusEntries) && validBonusEntries.length
      ? validBonusEntries
      : [];
  }

  get exemptMembersFunction() {
    return this.options.exemptMembers
      ? typeof this.options.exemptMembers === "string" &&
        this.options.exemptMembers.includes("function anonymous")
        ? eval(`(${this.options.exemptMembers})`)
        : eval(this.options.exemptMembers)
      : null;
  }

  async exemptMembers(member) {
    if (typeof this.exemptMembersFunction === "function") {
      try {
        const result = await this.exemptMembersFunction(member);
        return result;
      } catch (err) {
        console.error(
          `Giveaway message ID: ${this.messageID}\n${serialize(
            this.exemptMembersFunction
          )}\n${err}`
        );
        return false;
      }
    }
    if (typeof this.manager.options.default.exemptMembers === "function") {
      return await this.manager.options.default.exemptMembers(member);
    }
    return false;
  }

  get channel() {
    return this.client.channels.cache.get(this.channelID);
  }

  get remainingTimeText() {
    const roundTowardsZero = this.remainingTime > 0 ? Math.floor : Math.ceil;

    // Gets days, hours, minutes and seconds
    const days = roundTowardsZero(this.remainingTime / 86400000);
    const hours = roundTowardsZero(this.remainingTime / 3600000) % 24;
    const minutes = roundTowardsZero(this.remainingTime / 60000) % 60;
    let seconds = roundTowardsZero(this.remainingTime / 1000) % 60;

    // Increment seconds if equal to zero
    if (seconds === 0) {
      seconds++;
    }

    // Whether values are inferior to zero
    const isDay = days > 0;
    const isHour = hours > 0;
    const isMinute = minutes > 0;
    const dayUnit =
      days < 2 &&
      (this.messages.units.pluralS || this.messages.units.days.endsWith("s"))
        ? this.messages.units.days.substr(
            0,
            this.messages.units.days.length - 1
          )
        : this.messages.units.days;
    const hourUnit =
      hours < 2 &&
      (this.messages.units.pluralS || this.messages.units.hours.endsWith("s"))
        ? this.messages.units.hours.substr(
            0,
            this.messages.units.hours.length - 1
          )
        : this.messages.units.hours;
    const minuteUnit =
      minutes < 2 &&
      (this.messages.units.pluralS || this.messages.units.minutes.endsWith("s"))
        ? this.messages.units.minutes.substr(
            0,
            this.messages.units.minutes.length - 1
          )
        : this.messages.units.minutes;
    const secondUnit =
      seconds < 2 &&
      (this.messages.units.pluralS || this.messages.units.seconds.endsWith("s"))
        ? this.messages.units.seconds.substr(
            0,
            this.messages.units.seconds.length - 1
          )
        : this.messages.units.seconds;

    // Generates a first pattern
    const pattern = `${isDay ? `{days} ${dayUnit}, ` : ""}${
      isHour ? `{hours} ${hourUnit}, ` : ""
    }${isMinute ? `{minutes} ${minuteUnit}, ` : ""}{seconds} ${secondUnit}`;

    // Format the pattern with the right values
    const content = this.messages.timeRemaining
      .replace("{duration}", pattern)
      .replace("{days}", days.toString())
      .replace("{hours}", hours.toString())
      .replace("{minutes}", minutes.toString())
      .replace("{seconds}", seconds.toString());
    return content;
  }

  get data() {
    const baseData = {
      messageID: this.messageID,
      channelID: this.channelID,
      guildID: this.guildID,
      startAt: this.startAt,
      endAt: this.endAt,
      ended: this.ended,
      winnerCount: this.winnerCount,
      prize: this.prize,
      messages: this.messages,
      hostedBy: this.options.hostedBy,
      embedColor: this.options.embedColor,
      embedColorEnd: this.options.embedColorEnd,
      botsCanWin: this.options.botsCanWin,
      exemptPermissions: this.options.exemptPermissions,
      exemptMembers:
        !this.options.exemptMembers ||
        typeof this.options.exemptMembers === "string"
          ? this.options.exemptMembers
          : serialize(this.options.exemptMembers),
      bonusEntries:
        typeof this.options.bonusEntries === "string"
          ? this.options.bonusEntries
          : serialize(this.options.bonusEntries),
      reaction: this.options.reaction,
      winnerIDs: this.winnerIDs,
      extraData: this.extraData,
      lastChance: this.options.lastChance,
    };
    return baseData;
  }

  async fetchMessage() {
    if (!this.messageID) {
      return;
    }
    const message = await this.channel.messages
      .fetch(this.messageID)
      .catch((err) => console.error(err));
    if (!message) {
      this.manager.giveaways = this.manager.giveaways.filter(
        (g) => g.messageID !== this.messageID
      );
      await this.manager.deleteGiveaway(this.messageID);
      return `Unable to fetch message with ID ${this.messageID}.`;
    }
    this.message = message;

    return message;
  }

  async checkWinnerEntry(user) {
    if (this.winnerIDs.includes(user.id)) {
      return false;
    }
    const guild = this.channel.guild;
    const member =
      guild.members.cache.get(user.id) ||
      (await guild.members.fetch(user.id).catch((err) => console.error(err)));
    if (!member) {
      return false;
    }
    const exemptMember = await this.exemptMembers(member);
    if (exemptMember) {
      return false;
    }
    const hasPermission = this.exemptPermissions.some((permission) =>
      member.permissions.has(permission)
    );
    if (hasPermission) {
      return false;
    }
    return true;
  }

  async checkBonusEntries(user) {
    const member = this.channel.guild.members.cache.get(user.id);
    const entries = [];
    const cumulativeEntries = [];

    if (this.bonusEntries.length) {
      for (const obj of this.bonusEntries) {
        if (typeof obj.bonus === "function") {
          try {
            const result = await obj.bonus(member);
            if (Number.isInteger(result) && result > 0) {
              if (obj.cumulative) {
                cumulativeEntries.push(result);
              } else {
                entries.push(result);
              }
            }
          } catch (err) {
            console.error(
              `Giveaway message ID: ${this.messageID}\n${serialize(
                obj.bonus
              )}\n${err}`
            );
          }
        }
      }
    }

    if (cumulativeEntries.length) {
      entries.push(cumulativeEntries.reduce((a, b) => a + b));
    }
    if (entries.length) {
      return Math.max.apply(Math, entries);
    }
    return false;
  }

  async roll(winnerCount = this.winnerCount) {
    if (!this.message) {
      return [];
    }
    // Pick the winner
    const reactions = this.message.reactions.cache;
    const reaction =
      reactions.get(this.reaction) ||
      reactions.find((r) => r.emoji.name === this.reaction);
    if (!reaction) {
      return [];
    }
    const guild = this.channel.guild;
    // Fetch guild members
    if (this.manager.options.hasGuildMembersIntent) {
      await guild.members.fetch();
    }
    const users = (await reaction.users.fetch())
      .filter((u) => !u.bot || u.bot === this.botsCanWin)
      .filter((u) => u.id !== this.message.client.user.id);
    if (!users.size) {
      return [];
    }

    // Bonus Entries
    let userArray = Object.values(users);
    if (this.bonusEntries.length) {
      for (const user of userArray.slice()) {
        const isUserValidEntry = await this.checkWinnerEntry(user);
        if (!isUserValidEntry) {
          continue;
        }

        const highestBonusEntries = await this.checkBonusEntries(user);
        if (!highestBonusEntries) {
          continue;
        }

        for (let i = 0; i < highestBonusEntries; i++) {
          userArray.push(user);
        }
      }
    }

    let rolledWinners;
    if (!userArray || userArray.length <= winnerCount) {
      rolledWinners = users.random(Math.min(winnerCount, users.size));
    } else {
      /**
       * Random mechanism like https://github.com/discordjs/collection/blob/master/src/index.ts#L193
       * because collections/maps do not allow dublicates and so we cannot use their built in "random" function
       */
      rolledWinners = Array.from(
        {
          length: Math.min(winnerCount, users.size),
        },
        () =>
          userArray.splice(Math.floor(Math.random() * userArray.length), 1)[0]
      );
    }

    const winners = [];

    for (const u of rolledWinners) {
      const isValidEntry =
        !winners.some((winner) => winner.id === u.id) &&
        (await this.checkWinnerEntry(u));
      if (isValidEntry) {
        winners.push(u);
      } else {
        // Find a new winner
        for (const user of userArray) {
          const isUserValidEntry =
            !winners.some((winner) => winner.id === user.id) &&
            (await this.checkWinnerEntry(user));
          if (isUserValidEntry) {
            winners.push(user);
            break;
          }
        }
      }
    }

    return winners.map((user) => guild.members.cache.get(user.id) || user);
  }

  async edit(options = {}) {
    if (this.ended) {
      return `Giveaway with message ID ${this.messageID} is already ended.`;
    }
    if (!this.channel) {
      return `Unable to get the channel of the giveaway with message ID ${this.messageID}.`;
    }

    await this.fetchMessage().catch((err) => console.error(err));

    if (!this.message) {
      return `Unable to fetch message with ID ${this.messageID}.`;
    }
    if (
      Number.isInteger(options.newWinnerCount) &&
      options.newWinnerCount > 0
    ) {
      this.winnerCount = options.newWinnerCount;
    }
    if (typeof options.newPrize === "string") {
      this.prize = options.newPrize;
    }
    if (options.addTime && !isNaN(options.addTime)) {
      this.endAt = this.endAt + options.addTime;
    }
    if (options.setEndTimestamp && !isNaN(options.setEndTimestamp)) {
      this.endAt = options.setEndTimestamp;
    }
    if (options.newMessages && typeof options.newMessages === "object") {
      this.messages = merge(this.messages, options.newMessages);
    }
    if (
      Array.isArray(options.newBonusEntries) &&
      options.newBonusEntries.every((elem) => typeof elem === "object")
    ) {
      this.options.bonusEntries = options.newBonusEntries;
    }
    if (options.newExtraData) {
      this.extraData = options.newExtraData;
    }
    // Call the db method
    await this.manager.editGiveaway(this.messageID, this.data);

    return this;
  }

  async end() {
    if (this.ended) {
      return `Giveaway with message ID ${this.messageID} is already ended`;
    }
    if (!this.channel) {
      return `Unable to get the channel of the giveaway with message ID ${this.messageID}.`;
    }
    this.ended = true;
    this.endAt = Date.now();
    await this.fetchMessage().catch((err) => console.error(err));
    if (!this.message) {
      return `Unable to fetch message with ID ${this.messageID}.`;
    }
    const winners = await this.roll();
    await this.manager.editGiveaway(this.messageID, this.data);
    if (winners.length > 0) {
      this.winnerIDs = winners.map((w) => w.id);
      await this.manager.editGiveaway(this.messageID, this.data);
      const embed = this.manager.generateEndEmbed(this, winners);
      await this.message
        .edit({ content: `${this.messages.giveawayEnded}`, embeds: [embed] })
        .catch((err) => console.error(err));
      let formattedWinners = winners.map((w) => `<@${w.id}>`).join(", ");
      const messageString = this.messages.winMessage
        .replace("{winners}", formattedWinners)
        .replace("{prize}", this.prize)
        .replace("{messageURL}", this.messageURL);
      if (messageString.length <= 2000) {
        this.message.reply(messageString);
      } else {
        this.message.reply(
          this.messages.winMessage
            .substr(0, this.messages.winMessage.indexOf("{winners}"))
            .replace("{prize}", this.prize)
            .replace("{messageURL}", this.messageURL)
        );
        while (formattedWinners.length >= 2000) {
          await this.message.reply(
            `${formattedWinners.substr(
              0,
              formattedWinners.lastIndexOf(",", 1999)
            )},`
          );
          formattedWinners = formattedWinners.slice(
            formattedWinners.substr(
              0,
              formattedWinners.lastIndexOf(",", 1999) + 2
            ).length
          );
        }
        this.message.reply(formattedWinners);
        this.message.reply(
          this.messages.winMessage
            .substr(this.messages.winMessage.indexOf("{winners}") + 9)
            .replace("{prize}", this.prize)
            .replace("{messageURL}", this.messageURL)
        );
      }
      return winners;
    } else {
      const embed = this.manager.generateNoValidParticipantsEndEmbed(this);
      this.message
        .edit({
          content: `${this.messages.giveawayEnded}`,
          embeds: [embed],
        })
        .catch((err) => console.error(err));
      return [];
    }
  }

  async reroll(options) {
    if (!this.ended) {
      return `Giveaway with message ID ${this.messageID} is not ended.`;
    }
    if (!this.channel) {
      return `Unable to get the channel of the giveaway with message ID ${this.messageID}.`;
    }
    await this.fetchMessage().catch((err) => console.error(err));
    if (!this.message) {
      return `Unable to fetch message with ID ${this.messageID}.`;
    }
    const winners = await this.roll(options.winnerCount || undefined);
    if (winners.length > 0) {
      this.winnerIDs = winners.map((w) => w.id);
      await this.manager.editGiveaway(this.messageID, this.data);
      const embed = this.manager.generateEndEmbed(this, winners);
      await this.message
        .edit({ content: `${this.messages.giveawayEnded}`, embeds: [embed] })
        .catch((err) => console.error(err));
      let formattedWinners = winners.map((w) => `<@${w.id}>`).join(", ");
      const messageString = options.messages.congrat
        .replace("{winners}", formattedWinners)
        .replace("{prize}", this.prize)
        .replace("{messageURL}", this.messageURL);
      if (messageString.length <= 2000) {
        this.message.reply(messageString);
      } else {
        this.message.reply(
          options.messages.congrat
            .substr(0, options.messages.congrat.indexOf("{winners}"))
            .replace("{prize}", this.prize)
            .replace("{messageURL}", this.messageURL)
        );
        while (formattedWinners.length >= 2000) {
          await this.message.reply(
            `${formattedWinners.substr(
              0,
              formattedWinners.lastIndexOf(",", 1999)
            )},`
          );
          formattedWinners = formattedWinners.slice(
            formattedWinners.substr(
              0,
              formattedWinners.lastIndexOf(",", 1999) + 2
            ).length
          );
        }
        this.message.reply(formattedWinners);
        this.message.reply(
          options.messages.congrat
            .substr(options.messages.congrat.indexOf("{winners}") + 9)
            .replace("{prize}", this.prize)
            .replace("{messageURL}", this.messageURL)
        );
      }
      return winners;
    } else {
      this.message.reply(options.messages.error);
      return [];
    }
  }
}

module.exports = Giveaway;
