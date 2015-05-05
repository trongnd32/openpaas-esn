'use strict';

angular.module('esn.calendar')
  .constant('COMMUNITY_UI_CONFIG', {
    calendar: {
      height: 450,
      editable: false,
      weekNumbers: true,
      firstDay: 1,
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay'
      }
    }
  })
  .constant('USER_UI_CONFIG', {
    calendar: {
      height: 450,
      editable: false,
      weekNumbers: true,
      firstDay: 1,
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay'
      }
    }
  })
  .controller('communityCalendarController', ['$scope', 'community', 'calendarService', 'calendarEventSource', 'COMMUNITY_UI_CONFIG', function($scope, community, calendarService, calendarEventSource, COMMUNITY_UI_CONFIG) {

    $scope.changeView = function(view, calendar) {
      calendar.fullCalendar('changeView', view);
    };

    $scope.renderCalender = function(calendar) {
      calendar.fullCalendar('render');
    };

    $scope.uiConfig = COMMUNITY_UI_CONFIG;
    $scope.eventSources = [calendarEventSource(community._id)];
  }])
  .controller('userCalendarController', ['$scope', 'user', 'calendarService', 'calendarEventSource', 'USER_UI_CONFIG', function($scope, user, calendarService, calendarEventSource, USER_UI_CONFIG) {

    $scope.changeView = function(view, calendar) {
      calendar.fullCalendar('changeView', view);
    };

    $scope.renderCalender = function(calendar) {
      calendar.fullCalendar('render');
    };

    $scope.uiConfig = USER_UI_CONFIG;
    $scope.eventSources = [calendarEventSource(user._id)];
  }]);
