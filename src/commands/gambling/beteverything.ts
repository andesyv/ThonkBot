import {
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  Message,
  SlashCommandBuilder
} from 'discord.js';
import { ICommandBase, IMessageCommand, ISlashCommand } from '../../command.js';
import { Logger } from 'winston';
import { getNickname, logError } from '../../utils.js';
import { getUserPointsEntry, updatePoints } from '../../dbutils.js';
import { formatReply, gamble } from './bet.js';

const beteverything: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('beteverything')
    .setDescription(
      "Continue to gamble all your hard earned points away until there's nothing left"
    ),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (!(interaction.member instanceof GuildMember))
        return interaction.reply('Command is only available in a server. :(');

      let { points } = await getUserPointsEntry(interaction.member);
      let nextMessage: Message | null = null;
      while (0 < points && points !== Infinity) {
        const amount = points;
        const [newPoints, roll] = gamble(points, amount);
        points = newPoints;

        const messageContent = formatReply(
          getNickname(interaction.member, interaction.user),
          amount,
          roll,
          newPoints
        );

        // We skip telling the user that they're broke, as this was a bit spammy
        if (points <= 0)
          return (nextMessage ?? interaction).reply(messageContent);

        if (nextMessage === null) {
          nextMessage = await (await interaction.reply(messageContent)).fetch();
        } else {
          nextMessage = await nextMessage.reply(messageContent);
        }
      }

      updatePoints(interaction.member, points);

      if (points <= 0) {
        if (nextMessage !== null)
          logger.log(
            'warn',
            'Logic error: Should not have reached this point... But we can recover!'
          );

        return interaction.reply("You're broke!");
      }

      return (nextMessage ?? interaction).reply(
        "You're a bazillionaire! You have nothing to gain from gambling anymore."
      );
    } catch (e) {
      logError(e, logger);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['gamble'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      if (!message.member)
        return message.channel.send(
          'Command is only available in a server. :('
        );

      let { points } = await getUserPointsEntry(message.member);
      let nextMessage = message;
      while (0 < points && points !== Infinity) {
        const amount = points;
        const [newPoints, roll] = gamble(points, amount);
        points = newPoints;

        const messageContent = formatReply(
          getNickname(message.member, message.author),
          amount,
          roll,
          newPoints
        );

        // We skip telling the user that they're broke, as this was a bit spammy
        if (points <= 0) return nextMessage.reply(messageContent);

        nextMessage = await nextMessage.reply(messageContent);
      }

      updatePoints(message.member, points);

      if (points <= 0) return nextMessage.reply("You're broke!");
      return nextMessage.reply(
        "You're a bazillionaire! You have nothing to gain from gambling anymore."
      );
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default beteverything;
