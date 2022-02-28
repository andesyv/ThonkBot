import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Client, Message, GuildMember } from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../../command';
import { Logger } from 'winston';
import { getUserPointsEntry, updatePoints } from '../../dbutils';
import { getCommandArgs } from '../../utils';

const parseNumber = (s: string): number | undefined => {
  const n = Number.parseInt(s);
  return Number.isNaN(s) ? undefined : n;
};

const givepoints: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('givepoints')
    .setDescription('Donate your hard earned points to others')
    .addUserOption((opt) =>
      opt
        .setName('target')
        .setDescription('The person to gift your points to')
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Points amount to donate')
        .setMinValue(1)
        .setRequired(true)
    ),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (interaction.member instanceof GuildMember) {
        const target = interaction.options.getMember('target', true);
        if (target === interaction.member) {
          return interaction.reply({
            content: 'You cannot give points to yourself!',
            ephemeral: true
          });
        } else if (!(target instanceof GuildMember)) {
          throw new Error('Somehow managed to target user not in guild');
        }
        const authorName = interaction.member.nickname ?? interaction.user.tag;
        const receiverName = target.nickname ?? target.user.tag;
        const senderPoints = (await getUserPointsEntry(interaction.member))
          .points;
        if (senderPoints <= 0) {
          return interaction.reply({
            content: "You're broke!",
            ephemeral: true
          });
        }
        const amount = Math.min(
          interaction.options.getInteger('amount', true),
          senderPoints
        );

        updatePoints(interaction.member, senderPoints - amount);
        updatePoints(
          target,
          (await getUserPointsEntry(target)).points + amount
        );

        return interaction.reply(
          `${authorName} gave ${receiverName} ${amount} points! :o`
        );
      } else {
        return interaction.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['give'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (message.member) {
        const { points } = await getUserPointsEntry(message.member);
        if (points <= 0) {
          return message.reply("You're broke!");
        } else {
          const args = getCommandArgs(message);
          const amount = args
            .map((s) => (s.toUpperCase() === 'ALL' ? points : parseNumber(s)))
            .find((v) => v);
          const target = message.mentions.members?.first();

          if (amount && target) {
            if (target === message.member) {
              return message.reply('You cannot give points to yourself!');
            }

            const authorName = message.member.nickname ?? message.author.tag;
            const receiverName = target.nickname ?? target.user.tag;
            const senderPoints = (await getUserPointsEntry(message.member))
              .points;

            updatePoints(message.member, senderPoints - amount);
            updatePoints(
              target,
              (await getUserPointsEntry(target)).points + amount
            );

            return message.reply(
              `${authorName} gave ${receiverName} ${amount} points! :o`
            );
          } else {
            return message.reply(
              'You have to specify a number to give and @someone. Example: `!givepoints @ThonkBot 100`'
            );
          }
        }
      } else {
        return message.reply('Command is only available in a server. :(');
      }
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default givepoints;
