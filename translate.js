/**
 * Gets word maps from <language>.json files, uses Google Api to translate the keys,
 * maps them back and prints them in <language>.json files in the assets folder.
 */
'use strict';

require('dotenv').config();
const core = require('@actions/core');
const fs = require('fs');
const {Translate} = require('@google-cloud/translate').v2;
const credentials = fs.readFileSync(process.env['GOOGLE_APPLICATION_CREDENTIALS']).toJSON();

class Translator {
  constructor(projectId) {
    this.translatedCharsCount = 0;
    this.translateService = new Translate({projectId});
  }

  async translate(languages) {
    this._log(`Translating to following languages: ${JSON.stringify(languages)}`);

    const translations = languages.map(async (lang) => {
      const untranslatedMap = this._getUntranslatedMap(lang);
      this._log(`Translating to language: ${lang}.json`);
      const translatedMap = await this._translate(untranslatedMap, lang);
      this._writeToFile(translatedMap, lang);
    });
    await Promise.all(translations);
    this._writeDefaultLanguage();

    this._log(`Translation finished. Generated files: ${languages.map(lang => ' ' + lang + '.json')}, en.json`);
    this._log(`Total chars translated: ${this.translatedCharsCount}`);
  }

  _getUntranslatedMap(language) {
    return {
      ...this._readJson(`${__dirname}/src/assets/i18n/${language}.json`),
    };
  }

  _readJson(path) {
    return fs.readFileSync(path).toJSON();
  }

  async _translate(translationMap, targetLanguage) {
    const translationMapCopy = this._shallowCopy(translationMap);

    const untranslatedWords = this._getUntranslatedWords(translationMapCopy);
    if (this._allWordsAreAlreadyTranslated(untranslatedWords)) {
      return translationMapCopy;
    }
    this._logTranslatedChars(untranslatedWords, targetLanguage);
    const [translatedWords] = await this.translateService.translate(untranslatedWords, {
      from: 'en',
      to: targetLanguage,
      model: 'nmt'
    });
    untranslatedWords.map(async (word, index) => {
      translationMapCopy[word] = translatedWords[index];
    });

    return translationMapCopy;
  }

  _allWordsAreAlreadyTranslated(untranslatedWords) {
    return untranslatedWords.length === 0;
  }

  _getUntranslatedWords(configCopy) {
    return Object.keys(configCopy).filter(key => configCopy[key] === '');
  }

  _writeDefaultLanguage() {
    this._writeToFile(this._getDefaultLanguage(this._getUntranslatedMap('en')), 'en');
  }

  _getDefaultLanguage(translationMap) {
    const translationMapCopy = this._shallowCopy(translationMap);
    const words = Object.keys(translationMap);

    words.map(async (word) => {
      translationMapCopy[word] = word;
    });

    return translationMapCopy;
  }

  _logTranslatedChars(wordsMap, lang) {
    const count = JSON.stringify(wordsMap).length;
    this._log(`Translating ${count} characters for ${lang} language`);
    this.translatedCharsCount += count;
  }

  _writeToFile(payload, lang) {
    const filename = `${__dirname}/src/assets/i18n/${lang}.json`;
    fs.writeFileSync(filename, JSON.stringify(payload, null, 2));
  }

  _shallowCopy(object) {
    return {
      ...object,
    };
  }

  _log(value) {
    core.debug(value);
  }
}

(async () => {
  const languages = process.argv.slice(2);
  const translator = new Translator(credentials['project_id']);
  await translator.translate(languages);
})().catch(e => {
  console.log(e);
  process.exitCode = 1;
});
