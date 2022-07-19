import SQLite, { SqliteError } from 'better-sqlite3';
import * as dateFns from 'date-fns';
import { EmbedBuilder, Guild, GuildMember } from 'discord.js';
export const db = new SQLite('./db.sqlite');

export interface DBBank {
  bid?: number;
  id: string;
  user: string;
  points: number;
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
        points INTEGER
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
        points: 100
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

export const updatePoints = ({ id, guild }: GuildMember, points: number) => {
  const setScore = db.prepare(
    'UPDATE bank SET points = @points WHERE bid = (SELECT bid FROM guilds WHERE uid = @uid AND gid = @gid);'
  );
  setScore.run({ uid: id, gid: guild.id, points: points });
};

export const getLeaderboards = async (
  guild: Guild
): Promise<EmbedBuilder | undefined> => {
  const guilds = (
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
    .slice(0, 10);
  guilds.sort((a, b) => b.points - a.points);
  if (0 < guilds.length) {
    const longestName = guilds
      .map(({ user }) => user)
      .reduce((l, r) => (l.length < r.length ? r : l), '').length;

    const desc = guilds
      .map(({ user, points }, i) => {
        return `${i + 1}. \t \`${user}\` ${' '.repeat(
          longestName - user.length
        )}\t (**${points}** sthonks)`;
      })
      .join('\n');
    return new EmbedBuilder({
      title: 'Leaderboards',
      description: desc
    });
  }
};
