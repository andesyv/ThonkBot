import SQLite, { SqliteError } from 'better-sqlite3';
import * as dateFns from 'date-fns';
import { EmbedBuilder, Guild, GuildChannel, GuildMember } from 'discord.js';
import { Logger } from 'winston';
import {
  ScorePointRepresentation,
  formatLeaderboards,
  logError
} from './utils.js';
export const db = new SQLite('./db.sqlite');

export interface DBBank {
  bid?: number;
  id: string;
  user: string;
  points: number;
  eggs: number;
}

export interface DBMetabank {
  bid: number;
  lastupdated: string;
}

export interface DBGuild {
  gid: string;
  uid: string;
}

// https://stackoverflow.com/questions/45020874/typescript-wrapping-function-with-generic-type
export const wrapDBThrowable = <T extends (...args: any[]) => any>(
  func: T
): T => {
  return <T>((...args: any[]) => {
    try {
      return func(...args);
    } catch (e) {
      if (e instanceof SqliteError) {
        throw new Error(
          `DataBase error: { Name: ${e.name}, CODE: ${e.code}, MESSAGE: {${e.message}} }`
        );
      } else {
        throw new Error(Object.toString.call(e));
      }
    }
  });
};

export const initDB = () => {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS bank (
        bid INTEGER PRIMARY KEY,
        id TEXT,
        user TEXT,
        points INTEGER DEFAULT 0,
        eggs INTEGER DEFAULT 0
        );`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS metabank (
        bid INTEGER PRIMARY KEY,
        lastupdated TEXT
        );`
  ).run();
  db.prepare(
    `CREATE TRIGGER IF NOT EXISTS recordtime AFTER UPDATE ON bank
        BEGIN
            UPDATE metabank SET lastupdated=datetime('now') WHERE bid = NEW.bid;
        END;`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS guilds (
        gid TEXT,
        uid TEXT,
        bid INTEGER PRIMARY KEY
        );`
  ).run();
};

export const getTimePoints = (member: GuildMember): number => {
  const sqltime = (
    db
      .prepare(
        'select lastupdated from metabank where bid = (select bid from guilds where uid = @uid and gid = @gid);'
      )
      .get({ uid: member.id, gid: member.guild.id }) as DBMetabank | undefined
  )?.lastupdated;
  const accessed =
    sqltime !== undefined ? dateFns.parseISO(sqltime) : new Date();
  return Math.floor(
    dateFns.intervalToDuration({ start: accessed, end: new Date() }).minutes ??
      0
  );
};

export const getUserPointsEntry = (member: GuildMember): Promise<DBBank> => {
  try {
    let obj = db
      .prepare(
        'SELECT * FROM bank WHERE bid = (SELECT bid FROM guilds WHERE uid = @uid AND gid = @gid);'
      )
      .get({ gid: member.guild.id, uid: member.id }) as DBBank | undefined;
    if (obj) {
      obj.points += getTimePoints(member);
      return Promise.resolve(obj);
    } else {
      obj = {
        id: member.id,
        user: member.user.tag,
        points: 100,
        eggs: 0
      };

      const createUserTable = db.transaction((userObject: DBBank) => {
        db.prepare('INSERT INTO guilds(gid, uid) VALUES (@gid, @uid);').run({
          gid: member.guild.id,
          uid: userObject.id
        });
        db.prepare(
          'INSERT INTO bank(bid, id, user, points) VALUES ((SELECT bid FROM guilds where uid = @uid AND gid = @gid), @uid, @tag, @points);'
        ).run({
          uid: userObject.id,
          gid: member.guild.id,
          tag: userObject.user,
          points: userObject.points
        });
        db.prepare(
          "INSERT INTO metabank(bid, lastupdated) VALUES ((SELECT bid FROM guilds where uid = @uid AND gid = @gid), datetime('now'));"
        ).run({ uid: userObject.id, gid: member.guild.id });
      });

      createUserTable(obj);
      return Promise.resolve(obj);
    }
  } catch (e) {
    if (e instanceof SqliteError) {
      throw new Error(
        `DataBase error: { Name: ${e.name}, CODE: ${e.code}, MESSAGE: {${e.message}} }`
      );
    } else {
      throw new Error(Object.toString.call(e));
    }
  }
};

export const updatePoints = (
  { id, guild }: GuildMember,
  points: number,
  eggs?: number
) => {
  const setScore = db.prepare(
    `UPDATE bank SET points = @points${
      eggs !== undefined ? ', eggs = @eggs' : ''
    } WHERE bid = (SELECT bid FROM guilds WHERE uid = @uid AND gid = @gid);`
  );
  setScore.run({ uid: id, gid: guild.id, points: points, eggs: eggs });
};

export const getLeaderboards = async (
  guild: Guild
): Promise<EmbedBuilder | undefined> => {
  const bankEntries = (
    await Promise.all(
      db
        .prepare(
          `SELECT * FROM bank
      WHERE bid IN (SELECT bid FROM guilds WHERE gid = @gid);`
        )
        .all({ gid: guild.id })
        .map(async (p: DBBank): Promise<DBBank | undefined> => {
          const member = await guild.members.fetch(p.id);
          return member
            ? { ...p, points: p.points + getTimePoints(member) }
            : undefined;
        })
    )
  )
    .filter((v): v is DBBank => v !== undefined)
    .slice(0, 10)
    .map((entry): Parameters<typeof formatLeaderboards>[0][0] => {
      const scores: ScorePointRepresentation[] = [
        { name: 'sthonks', value: entry.points }
      ];
      if (0 < entry.eggs)
        scores.push({
          name: 1 < entry.eggs ? 'eggs' : 'egg',
          value: entry.eggs
        });
      return {
        user: entry.user,
        score: scores
      };
    });

  return 0 < bankEntries.length ? formatLeaderboards(bankEntries) : undefined;
};

export enum RecordType {
  Guild = 0,
  User
}

export interface RecordDBEntry {
  id: string;
  gid: string;
  type: RecordType;
}

export const initRecordTable = async (table: string, logger: Logger) => {
  try {
    wrapDBThrowable(() => {
      db.prepare(
        `CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT NOT NULL,
          gid TEXT NOT NULL,
          type INTEGER NOT NULL,
          PRIMARY KEY (id, gid, type)
        );`
      ).run();
    })();
  } catch (e) {
    logError(e, logger);
  }
};

export const removeRecordEntry = (
  table: string,
  id: string,
  gid: string,
  type: RecordType
) => {
  db.prepare(
    `DELETE FROM ${table} WHERE id = @id AND gid = @gid AND type = @type`
  ).run({
    id: id,
    gid: gid,
    type: type
  });
};

export const addRecordEntry = (
  table: string,
  id: string,
  gid: string,
  type: RecordType
) => {
  db.prepare(
    `INSERT INTO ${table} (id, gid, type) VALUES(@id, @gid, @type)`
  ).run({
    id: id,
    gid: gid,
    type: type
  });
};

export const toggleIdRecord = (
  table: string,
  id: string,
  gid: string,
  type: RecordType
): boolean => {
  // Only filtering on ids for users so user ids are shared between guilds
  const filter =
    type === RecordType.Guild ? 'id = @id AND gid = @gid' : 'id = @id';
  const q = db.prepare(`SELECT * FROM ${table} WHERE ${filter}`);
  const q_res: RecordDBEntry | undefined = q.get({ id: id, gid: gid });
  const exists = q_res !== undefined;
  if (exists) {
    removeRecordEntry(table, id, gid, type);
  } else {
    addRecordEntry(table, id, gid, type);
  }
  return !exists;
};

export const toggleGuildRecord = (table: string, channel: GuildChannel) =>
  wrapDBThrowable(toggleIdRecord)(
    table,
    channel.id,
    channel.guild.id,
    RecordType.Guild
  );
export const toggleUserRecord = (table: string, user: GuildMember) =>
  wrapDBThrowable(toggleIdRecord)(
    table,
    user.id,
    user.guild.id,
    RecordType.User
  );
