import SQLite, { SqliteError } from 'better-sqlite3';
import * as dateFns from 'date-fns';
import { GuildMember } from 'discord.js';
const sql = new SQLite('./db.sqlite');

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

export const initDB = () => {
  sql
    .prepare(
      `CREATE TABLE IF NOT EXISTS bank (
        bid INTEGER PRIMARY KEY,
        id TEXT,
        user TEXT,
        points INTEGER
        );`
    )
    .run();
  sql
    .prepare(
      `CREATE TABLE IF NOT EXISTS metabank (
        bid INTEGER PRIMARY KEY,
        lastupdated TEXT
        );`
    )
    .run();
  sql
    .prepare(
      `CREATE TRIGGER IF NOT EXISTS recordtime AFTER UPDATE ON bank
        BEGIN
            UPDATE metabank SET lastupdated=datetime('now') WHERE bid = NEW.bid;
        END;`
    )
    .run();
  sql
    .prepare(
      `CREATE TABLE IF NOT EXISTS guilds (
        gid TEXT,
        uid TEXT,
        bid INTEGER PRIMARY KEY
        );`
    )
    .run();
};

export const getTimePoints = (member: GuildMember): number => {
  const sqltime = (
    sql
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
    let obj = sql
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

      const createUserTable = sql.transaction((userObject: DBBank) => {
        sql
          .prepare('INSERT INTO guilds(gid, uid) VALUES (@gid, @uid);')
          .run({ gid: member.guild.id, uid: userObject.id });
        sql
          .prepare(
            'INSERT INTO bank(bid, id, user, points) VALUES ((SELECT bid FROM guilds where uid = @uid AND gid = @gid), @uid, @tag, @points);'
          )
          .run({
            uid: userObject.id,
            gid: member.guild.id,
            tag: userObject.user,
            points: userObject.points
          });
        sql
          .prepare(
            "INSERT INTO metabank(bid, lastupdated) VALUES ((SELECT bid FROM guilds where uid = @uid AND gid = @gid), datetime('now'));"
          )
          .run({ uid: userObject.id, gid: member.guild.id });
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
