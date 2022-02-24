import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  Message,
  GuildMember,
  MessageEmbed,
  Guild,
  User
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { randomImageToEmbed } from '../utils';

const sendPersonalSpook = async (
  target: GuildMember,
  sender: GuildMember | User
) => {
  const { embeds, files } = await randomImageToEmbed('Spooks', 'Spooked!');
  const embed = (embeds as MessageEmbed[])[0].setFooter({
    text: `Spooked by ${
      sender instanceof GuildMember
        ? sender.nickname ?? sender.user.username
        : sender.username
    }`
  });

  target.send({ embeds: [embed], files });
};

const getGuildUser = (
  guild: Guild | null,
  user?: User
): GuildMember | undefined => {
  return user ? guild?.members.resolve(user) ?? undefined : undefined;
};

const spook: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('spook')
    .setDescription('Sends a spooky image.')
    .addUserOption((opt) =>
      opt.setName('target').setDescription('Person to spook').setRequired(false)
    ),
  handleInteraction: async (
    interaction: CommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const target = interaction.options.getMember('target');
      if (target instanceof GuildMember && !target.user.bot) {
        const author =
          getGuildUser(interaction.guild, interaction.user) ?? interaction.user;
        sendPersonalSpook(target, author);
        return interaction.reply({
          content: `Successfully spooked ${
            target.nickname ?? target.user.username
          }!`,
          ephemeral: true
        });
      } else {
        return interaction.reply(
          await randomImageToEmbed('Spooks', 'Spooked!')
        );
      }
    } catch (e) {
      logger.log('error', e);
      return interaction.reply({
        content: 'Command failed. :(',
        ephemeral: true
      });
    }
  },
  aliases: ['randomspook', 'skeleton'],
  handleMessage: async (
    message: Message,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const mentioned = getGuildUser(
        message.guild,
        message.mentions.users.first()
      );
      if (mentioned !== undefined && !mentioned.user.bot) {
        sendPersonalSpook(
          mentioned,
          getGuildUser(message.guild, message.author) ?? message.author
        );
      } else {
        return message.channel.send(
          await randomImageToEmbed('Spooks', 'Spooked!')
        );
      }
    } catch (e) {
      logger.log('error', e);
      return message.channel.send('Command failed. :(');
    }
  }
};

export default spook;
