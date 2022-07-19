import { SlashCommandBuilder } from '@discordjs/builders';
import {
  Client,
  Message,
  GuildMember,
  Guild,
  User,
  EmbedBuilder,
  ChatInputCommandInteraction
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command';
import { Logger } from 'winston';
import axios from 'axios';
import { giphy_key } from '../../config.json';
import { logError } from '../utils';

interface SpookyApiResponse {
  data: {
    images: {
      original: {
        url: string;
      };
    };
  };
}

const getRandomSpookImageUrl = async (): Promise<string> => {
  const api = await axios.get<SpookyApiResponse>(
    `https://api.giphy.com/v1/gifs/random?tag=skeleton&api_key=${giphy_key}`
  );
  return api.data.data.images.original.url;
};

const generateSpookEmbed = (url: string, title?: string): EmbedBuilder =>
  new EmbedBuilder({
    title: title,
    image: { url: url },
    timestamp: Date.now(),
    footer: { text: 'Powered by Giphy' }
  }).setColor('#0099ff');

const sendPersonalSpook = async (
  target: GuildMember,
  sender: GuildMember | User
): Promise<EmbedBuilder> => {
  const url = await getRandomSpookImageUrl();

  await target.send({
    embeds: [
      generateSpookEmbed(
        url,
        `Spooked by ${
          sender instanceof GuildMember
            ? sender.nickname ?? sender.user.username
            : sender.username
        }!`
      )
    ]
  });

  return generateSpookEmbed(
    url,
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
    interaction: ChatInputCommandInteraction,
    client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const target = interaction.options.getMember('target');
      if (target instanceof GuildMember && !target.user.bot) {
        await interaction.deferReply({ ephemeral: true });

        const author =
          getGuildUser(interaction.guild, interaction.user) ?? interaction.user;
        const embed = await sendPersonalSpook(target, author);
        return interaction.editReply({
          embeds: [embed]
        });
      } else {
        const url = await getRandomSpookImageUrl();
        return interaction.reply({
          embeds: [generateSpookEmbed(url, 'Spooked!')]
        });
      }
    } catch (e) {
      logError(e, logger);
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
        const url = await getRandomSpookImageUrl();
        return message.channel.send({
          embeds: [generateSpookEmbed(url, 'Spooked!')]
        });
      }
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default spook;
