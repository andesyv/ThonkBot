import { SlashCommandBuilder } from '@discordjs/builders';
import {
  CommandInteraction,
  Client,
  Message,
  GuildMember,
  MessageEmbed,
  Guild,
  User,
  InteractionReplyOptions
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import { randomImageToEmbed } from '../utils';
import axios from 'axios';
import { giphy_key } from '../../config.json';

interface SpookyApiResponse {
  data: {
    images: {
      original: {
        url: string;
      };
    };
  };
}

const getRandomSpookEmbed = async (): Promise<MessageEmbed> => {
  const api = await axios.get<SpookyApiResponse>(
    `https://api.giphy.com/v1/gifs/random?tag=skeleton&api_key=${giphy_key}`
  );

  const url = api.data.data.images.original.url;
  return new MessageEmbed()
    .setColor('#0099ff')
    .setImage(url)
    .setTimestamp()
    .setFooter({ text: 'Powered by Giphy' });
};

const sendPersonalSpook = async (
  target: GuildMember,
  sender: GuildMember | User
): Promise<MessageEmbed> => {
  const embed = await getRandomSpookEmbed();

  await target.send({
    embeds: [
      embed.setTitle(
        `Spooked by ${
          sender instanceof GuildMember
            ? sender.nickname ?? sender.user.username
            : sender.username
        }`
      )
    ]
  });

  return embed.setTitle(
    `Successfully spooked ${target.nickname ?? target.user.username} with this`
  );
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
        const embed = await sendPersonalSpook(target, author);
        return interaction.reply({
          ephemeral: true,
          embeds: [embed]
        });
      } else {
        const embed = await getRandomSpookEmbed();
        return interaction.reply({ embeds: [embed.setTitle('Spooked!')] });
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
        const embed = await sendPersonalSpook(
          mentioned,
          getGuildUser(message.guild, message.author) ?? message.author
        );
        message.author.send({ embeds: [embed] });
      } else {
        const embed = await getRandomSpookEmbed();
        return message.channel.send({
          embeds: [embed.setTitle('Spooked!')]
        });
      }
    } catch (e) {
      logger.log('error', e);
      return message.reply('Command failed. :(');
    }
  }
};

export default spook;
