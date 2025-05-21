import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  Message
} from 'discord.js';
import { ICommandBase, ISlashCommand, IMessageCommand } from '../command.ts';
import { Logger } from 'winston';
import { getCommandArgs, logError } from '../utils.ts';
import { writeFile } from 'fs/promises';
import { basename } from 'path';
import axios from 'axios';

// https://github.com/cat-milk/Anime-Girls-Holding-Programming-Books/issues/632
// https://github.com/THEGOLDENPRO/aghpb_api
const apiPath = 'https://api.devgoldy.xyz/aghpb/v1';

const getSanitizedLanguage = async (
  language: string | undefined,
  logger: Logger
): Promise<string | undefined> => {
  if (language === undefined) {
    return undefined;
  }

  try {
    const response = await axios.get<string[]>(`${apiPath}/categories`, {
      headers: { Accept: 'application/json' }
    });

    if (response.status !== 200) {
      return undefined;
    }

    for (const validLanguage of response.data) {
      if (validLanguage.toLowerCase().includes(language)) {
        return validLanguage;
      }
    }

    return undefined;
  } catch (e) {
    logError(e, logger);
    return undefined;
  }
};

const dataIsArrayBuffer = (
  data: ArrayBuffer | unknown,
  statusCode: number
): data is ArrayBuffer => statusCode == 200;

export const createImageEmbed = async (language?: string) => {
  const response = await axios.get<ArrayBuffer | unknown>(`${apiPath}/random`, {
    params: language !== undefined ? { category: language } : undefined,
    responseType: 'arraybuffer'
  });
  if (!dataIsArrayBuffer(response.data, response.status))
    throw new Error(
      `Failed to fetch image with: ${JSON.stringify(response.data)}`
    );

  const isPNG = response.headers['Content-Type'] === 'image/png';
  const tempFilePath = `temp.${isPNG ? 'png' : 'jpeg'}`;
  await writeFile(tempFilePath, Buffer.from(response.data));

  const attachment = new AttachmentBuilder(tempFilePath);
  const embed = new EmbedBuilder({
    title:
      language !== undefined ? `Programming! (${language})` : 'Programming!',
    image: { url: `attachment://${basename(tempFilePath)}` }
  });
  return {
    embeds: [embed],
    files: [attachment]
  };
};

const animeprogramming: ICommandBase & ISlashCommand & IMessageCommand = {
  data: new SlashCommandBuilder()
    .setName('animeprogramming')
    .setDescription(
      'Get some motivation to learn programming from some anime girls'
    )
    .addStringOption((opt) =>
      opt
        .setName('language')
        .setDescription('Specific programming language or topic')
        .setRequired(false)
    ),
  handleInteraction: async (
    interaction: ChatInputCommandInteraction,
    _client: Client,
    logger: Logger
  ): Promise<unknown> => {
    const language = interaction.options.getString('language')?.toLowerCase();
    const sanitizedLanguage = await getSanitizedLanguage(language, logger);
    if (language !== undefined && sanitizedLanguage === undefined) {
      return interaction.reply({
        content: "Anime girls don't program that language.",
        flags: 'Ephemeral'
      });
    }

    await interaction.deferReply();
    try {
      return interaction.editReply(await createImageEmbed(sanitizedLanguage));
    } catch (e) {
      logError(e, logger);
      return interaction.editReply('Command failed. :(');
    }
  },
  aliases: ['programming', 'programminganime', 'animecoding', 'coding'],
  handleMessage: async (
    message: Message,
    _client: Client,
    logger: Logger
  ): Promise<unknown> => {
    try {
      const args = getCommandArgs(message);
      const language = 0 < args.length ? args[0] : undefined;
      const sanitizedLanguage = await getSanitizedLanguage(language, logger);
      if (language !== undefined && sanitizedLanguage === undefined) {
        return message.reply("Anime girls don't program that language.");
      }

      return message.reply(await createImageEmbed(sanitizedLanguage));
    } catch (e) {
      logError(e, logger);
      return message.reply('Command failed. :(');
    }
  }
};

export default animeprogramming;
