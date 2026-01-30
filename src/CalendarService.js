if (typeof require !== 'undefined') {
  var { COMMUTE_KEYWORD } = require('./Constants');
}

/**
 * Googleカレンダーから「出社」イベントを集計するクラス
 */
function CalendarService() {}

/**
 * 指定された期間内の「出社」イベントを集計します。
 * @param {Date} startDate 期間開始日
 * @param {Date} endDate 期間終了日
 * @returns {Object} { count: number, dates: string[] }
 */
CalendarService.prototype.getCommuteSummary = function(startDate, endDate) {
  var calendar = CalendarApp.getDefaultCalendar();
  var events = calendar.getEvents(startDate, endDate);
  
  var commuteDates = {};

  var keyword = typeof COMMUTE_KEYWORD !== 'undefined' ? COMMUTE_KEYWORD : '出社';

  events.forEach(function(event) {
    if (event.getTitle().indexOf(keyword) !== -1) {
      var date = event.getStartTime();
      var dateString = date.getFullYear() + '-' + 
                       (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                       date.getDate().toString().padStart(2, '0');
      commuteDates[dateString] = true;
    }
  });

  var sortedDates = Object.keys(commuteDates).sort();

  return {
    count: sortedDates.length,
    dates: sortedDates
  };
};

if (typeof module !== 'undefined') {
  module.exports = { CalendarService };
}
