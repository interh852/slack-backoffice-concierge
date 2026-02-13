if (typeof require !== 'undefined') {
  var Constants = require('./Constants');
}

/**
 * Google AI Studio (Gemini API) との通信を担当する service
 */
function GeminiService() {
  this.apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  // スプレッドシートからモデル名を取得
  var sheetId = typeof Constants !== 'undefined' ? Constants.SPREADSHEET_ID : SPREADSHEET_ID;
  var sheetName = typeof Constants !== 'undefined' ? Constants.CONFIG_SHEET_NAME : CONFIG_SHEET_NAME;
  
  // フォールバック（定義されていない場合）
  if (!sheetId) sheetId = '';
  if (!sheetName) sheetName = '情報';
  
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(sheetName);
  this.model = sheet.getRange('B1').getValue();
  
  this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/' + this.model + ':generateContent?key=' + this.apiKey;
}

/**
 * Gemini APIにメッセージを送信し、レスポンスを取得する
 * @param {string} prompt ユーザーからの入力
 * @param {string} systemInstruction システムへの指示
 * @returns {string} Geminiの回答
 */
GeminiService.prototype.generateContent = function(prompt, systemInstruction) {
  if (!this.apiKey) {
    throw new Error('GEMINI_API_KEY is not set in Script Properties');
  }

  var payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
      responseMimeType: 'application/json'
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(this.apiUrl, options);
  var responseCode = response.getResponseCode();
  var responseText = response.getContentText();

  if (responseCode !== 200) {
    console.error('Gemini API Error:', responseText);
    throw new Error('Gemini API call failed with code ' + responseCode);
  }

  var result = JSON.parse(responseText);
  
  if (!result.candidates || result.candidates.length === 0 || !result.candidates[0].content || !result.candidates[0].content.parts) {
    throw new Error('Invalid response from Gemini API');
  }
  
  return result.candidates[0].content.parts[0].text;
};

if (typeof module !== 'undefined') {
  module.exports = { GeminiService };
}
