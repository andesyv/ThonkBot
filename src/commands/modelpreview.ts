import { SlashCommandBuilder } from '@discordjs/builders';
import {
  AttachmentBuilder,
  EmbedBuilder,
  Message,
  MessageReaction,
  ReactionCollector,
  User
} from 'discord.js';
import { ICommandBase } from '../command.ts';
import { Logger } from 'winston';
import BotClient from '../client.ts';
import { logError, rootDir } from '../utils.ts';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import axios, { AxiosResponse } from 'axios';
import { promisify } from 'util';
import { exec } from 'child_process';
import { differenceInMinutes } from 'date-fns';
import minimist from 'minimist';

// https://f3d.app/doc/user/SUPPORTED_FORMATS.html for a full list
const commonModelExtensions = [
  '.obj',
  '.gltf',
  '.glb',
  '.fbx',
  '.blend',
  '.stl',
  '.3mf'
];

const cliArgs = minimist(process.argv.slice(2));
const verbose =
  cliArgs.verbose !== undefined || process.env.VERBOSE !== undefined;

const isCommonModelFile = (filename: string): boolean =>
  commonModelExtensions.some((ext) => filename.endsWith(ext));

const createTmpFolder = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), 'ThonkBot-'));

const dataIsArrayBuffer = (
  response: AxiosResponse<unknown>
): response is AxiosResponse<ArrayBuffer> => response.status == 200;

const createModelPreview = async (msg: Message, logger: Logger) => {
  const workingDir = await createTmpFolder();

  const generatedResults: Map<string, string> = new Map();

  for (const [_, attachment] of msg.attachments) {
    const response = await axios.get<unknown>(attachment.url, {
      responseType: 'arraybuffer'
    });

    if (!dataIsArrayBuffer(response))
      throw new Error(
        `Failed to fetch message attachment. Returned data was: ${JSON.stringify(response)}`
      );

    const modelFile = path.join(
      workingDir,
      `model${path.extname(attachment.name)}`
    );
    await writeFile(modelFile, Buffer.from(response.data));

    const animatedOutput = path.join(
      workingDir,
      `${path.basename(attachment.name, path.extname(attachment.name))}.gif`
    );
    let imageGenerationCommand = `${path.join(rootDir, 'src', 'model-to-gif.py')} ${modelFile} ${animatedOutput} --frames 50`;
    if (verbose) imageGenerationCommand += '--verbose';

    const { stdout, stderr } = await promisify(exec)(imageGenerationCommand);
    if (stdout.trim() !== '')
      logger.verbose(`model-to-gif.py output: ${stdout}`);
    if (stderr.trim() !== '')
      throw new Error(`model-to-gif.py failed with error: ${stderr}`);

    generatedResults.set(attachment.name, animatedOutput);
  }

  const embeds = [];
  const files = [];
  for (const [inputFile, outputFile] of generatedResults) {
    files.push(new AttachmentBuilder(outputFile));
    embeds.push(
      new EmbedBuilder({
        title: `Model preview for ${inputFile}`,
        image: { url: `attachment://${path.basename(outputFile)}` }
      })
    );
  }

  await msg.reply({ embeds, files });

  await rm(workingDir, { recursive: true, force: true });
};

const collectors: Map<string, ReactionCollector> = new Map();
const cooldowns: Map<string, number> = new Map();

const addPreviewObserver = (
  msg: Message,
  logger: Logger,
  client: BotClient
) => {
  const hasModelAttachments = msg.attachments.some((attachment, _) =>
    isCommonModelFile(attachment.name)
  );
  if (!hasModelAttachments) return;

  const messageReactionFilter = (
    reaction: MessageReaction,
    user: User
  ): boolean => reaction.emoji.name === '🔍' && user.id !== client.user?.id;

  msg.react('🔍');
  const collector = msg.createReactionCollector({
    filter: messageReactionFilter,
    time: 10 * 60 * 1_000 // 10 min
  });

  logger.info(
    'Attached a reaction collector for previewing models to a message'
  );

  collector.on('collect', async (reaction, user) => {
    if (reaction.emoji.name !== '🔍')
      logger.error(
        `A message reaction collector was supposed to listen to 🔍 emojis, but got another one instead somehow. Actual reaction: { name: ${reaction.emoji.name}, id: ${reaction.emoji.id}`
      );

    logger.info(`User ${user.displayName} requested to show a model preview`);

    // Spam protection
    const lastPreview = cooldowns.get(user.id);
    if (
      lastPreview !== undefined &&
      differenceInMinutes(lastPreview, Date.now()) < 1
    ) {
      logger.info("... but was blocked because a minute hasn't passed yet");
      return;
    }

    try {
      await createModelPreview(msg, logger);
      cooldowns.set(user.id, Date.now());
      collector.stop();
    } catch (e) {
      logError(e, logger);
    }
  });

  collector.on('end', async () => {
    try {
      const reactions = msg.reactions.resolve('🔍');
      await reactions?.remove();
    } catch (e) {
      logError(e, logger);
    }

    collectors.delete(msg.id);
  });

  collectors.set(msg.id, collector);
};

const modelpreview: ICommandBase = {
  data: new SlashCommandBuilder()
    .setName('frenchreactions')
    .setDescription(
      'Toggle ThonkBot to react with an emoji everytime they think the text is french'
    ),
  init: async (client, logger) => {
    client.messageEvents.push((msg: Message) =>
      addPreviewObserver(msg, logger, client)
    );
  }
};

export default modelpreview;
