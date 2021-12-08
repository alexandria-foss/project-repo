import dbQuery from '../model/db-query';
import { Text, TextDB, convertTextTypes } from '../types';


const getAll = async function(): Promise<Array<Text> | null> {
  const ALL_TEXTS: string = `
    SELECT * FROM texts`;

  const result = await dbQuery(ALL_TEXTS);
  if (result.rows.length === 0) {
    return null;
  }

  return result.rows.map((dbItem: TextDB) => convertTextTypes(dbItem));
};


const getOne = async function(textId: number): Promise<Text | null> {
  const TEXT_BY_ID: string = `
    SELECT * FROM texts WHERE id = %L`;

  const result = await dbQuery(TEXT_BY_ID, textId);
  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};


const addNew = async function(textData: Text) {
  const {
    userId,
    languageId,
    title,
    author,
    text,
    sourceURL,
    sourceType,
  } = textData;

  const ADD_TEXT: string = `
    INSERT INTO texts 
    (user_id, language_id, title, author, text, ts_parsed_text, source_url, source_type)
    VALUES 
    (%s, %s, %L, %L, %L, to_tsvector(%L), %L, %L)`;

  await dbQuery(
    ADD_TEXT,
    userId,
    languageId,
    title,
    author || null,
    text,
    text,
    sourceURL || null,
    sourceType || null,
  );
};


export default {
  getAll,
  getOne,
  addNew,
};
