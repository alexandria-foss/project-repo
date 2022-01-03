/* eslint-disable max-len */
import boom from '@hapi/boom';
import { QueryResult } from 'pg';
import wordData from '../data-access/words';
import translations from './translations';
import {
  WordDB, Word, convertWordTypes, UserWord, SanitizedUser, Translation,
} from '../types';


const getAll = async function(): Promise<Array<Word>> {
  const result: QueryResult = await wordData.getAll();

  return result.rows.map((dbItem: WordDB) => convertWordTypes(dbItem));
};


const getById = async function(wordId: number): Promise<Word> {
  const result: QueryResult = await wordData.getById(wordId);

  if (result.rowCount === 0) throw boom.notFound('Could not find word with this id.');

  return convertWordTypes(result.rows[0]);
};


const getByLanguageAndUser = async function(languageId: string, userId: number): Promise<Array<Word>> {
  const result: QueryResult = await wordData.getByLanguageAndUser(languageId, userId);

  return result.rows.map((dbItem: WordDB) => convertWordTypes(dbItem));
};


const getUserwordsInText = async function(userId: number, textId: number, targetLanguageId: string, simple: boolean = true): Promise<Array<UserWord>> {
  const wordsResult: QueryResult = await wordData.getUserwordsInText(userId, textId, targetLanguageId, simple);

  const rawUserWords = wordsResult.rows;

  const userWords = rawUserWords.map((rawWord) => ({
    id: rawWord.word_id,
    word: rawWord.word,
    status: rawWord.status,
    translations: rawWord.translation_ids.map((id: number, index: number) => ({
      id,
      wordId: rawWord.word_id,
      targetLanguageId,
      translation: rawWord.translation_texts[index],
      context: rawWord.translation_contexts[index],
    })),
  }));

  return userWords;
};


const getUserwordsByLanguage = async function(languageId: string, userId: number): Promise<Array<UserWord>> {
  const wordsResult: QueryResult = await wordData.getUserwordsByLanguage(languageId, userId);

  const rawUserWords = wordsResult.rows;

  const userWords = rawUserWords.map((rawWord) => ({
    id: rawWord.word_id,
    word: rawWord.word,
    status: rawWord.status,
    translations: rawWord.translation_ids.map((id: number, index: number) => ({
      id,
      wordId: rawWord.word_id,
      targetLanguageId: rawWord.language_ids[index],
      translation: rawWord.translation_texts[index],
      context: rawWord.translation_contexts[index],
    })),
  }));

  return userWords;
};


const getWordInLanguage = async function (word: string, languageId: string): Promise<Word | null> {
  const result: QueryResult = await wordData.getWordInLanguage(word, languageId);

  if (result.rowCount === 0) return null;

  return convertWordTypes(result.rows[0]);
};


const addNew = async function(wordObject: Word): Promise<Word> {
  const result: QueryResult = await wordData.addNew(wordObject);

  if (result.rowCount === 0) throw boom.badRequest('Could not add new word.');

  return convertWordTypes(result.rows[0]);
};


const remove = async function(wordId: number): Promise<Word> {
  const result: QueryResult = await wordData.remove(wordId);

  if (result.rowCount === 0) throw boom.badRequest('Could not remove word.');

  return convertWordTypes(result.rows[0]);
};


const getStatus = async function(wordId: number, userId: number): Promise<string> {
  const result: QueryResult = await wordData.getStatus(wordId, userId);

  if (result.rowCount === 0) throw boom.badRequest('Could not get word status.');

  return result.rows[0].word_status;
};


const addStatus = async function(wordId: number, userId: number, wordStatus: string): Promise<string> {
  const result: QueryResult = await wordData.addStatus(wordId, userId, wordStatus);

  if (result.rowCount === 0) throw boom.badRequest('Could not add status to word.');

  return result.rows[0].word_status;
};


const updateStatus = async function(wordId: number, userId: number, wordStatus: string): Promise<string> {
  const result: QueryResult = await wordData.updateStatus(wordId, userId, wordStatus);

  if (result.rowCount === 0) throw boom.badRequest('Could not update word status.');

  return result.rows[0].word_status;
};


const addNewUserWord = async function(user: SanitizedUser, userWordData: UserWord): Promise<UserWord> {
  const returnUserWord = userWordData;

  const newWordData: Word = {
    word: userWordData.word,
    languageId: typeof user.learns === 'string' ? user.learns : user.learns.id,
  };

  const newWord: Word = await addNew(newWordData);

  if (newWord.id && user.id) {
    returnUserWord.id = newWord.id;
    await addStatus(newWord.id, user.id, userWordData.status);

    const uwdTranslation = userWordData.translations[0];

    const newTranslation: Translation = await translations.add(
      newWord.id,
      uwdTranslation.translation,
      uwdTranslation.targetLanguageId,
    );

    if (newTranslation.id) {
      returnUserWord.translations[0].id = newTranslation.id;
      await translations.addToUsersTranslations(user.id, newTranslation.id, uwdTranslation.context);
    }
  }

  return returnUserWord;
};


export default {
  getAll,
  getById,
  getByLanguageAndUser,
  getUserwordsInText,
  getWordInLanguage,
  getUserwordsByLanguage,
  addNew,
  remove,
  getStatus,
  addStatus,
  updateStatus,
  addNewUserWord,
};
