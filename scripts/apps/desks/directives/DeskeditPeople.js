DeskeditPeople.$inject = ['gettext', 'WizardHandler', 'desks', '$rootScope'];
export function DeskeditPeople(gettext, WizardHandler, desks, $rootScope) {
    return {
        link: function(scope, elem, attrs) {

            scope.$watch('step.current', function(step, previous) {
                if (step === 'people') {
                    scope.search = null;
                    scope.deskMembers = [];
                    scope.message = gettext('loading...');

                    if (scope.desk.edit && scope.desk.edit._id) {
                        desks.fetchUsers().then(function(result) {
                            scope.users = desks.users._items;
                            scope.deskMembers = desks.deskMembers[scope.desk.edit._id] || [];
                            scope.message = null;
                        });
                    } else {
                        WizardHandler.wizard('desks').goTo(previous);
                    }
                }
            });

            scope.add = function(user) {
                scope.deskMembers.unshift(user);
            };

            scope.remove = function(user) {
                _.remove(scope.deskMembers, user);
            };

            /**
             * Save members for editing desk
             *
             * @param {boolean} done
             *      when true it exits after saving otherwise
             *      continues to next step in wizard handler.
             */
            scope.save = function(done) {
                scope.message = gettext('Saving...');
                var members = _.map(scope.deskMembers, function(obj) {
                    return {user: obj._id};
                });

                scope.saving = true;
                desks.save(scope.desk.edit, {members: members}).then(function(res) {
                    angular.extend(scope.desk.edit, res);
                    desks.deskMembers[scope.desk.edit._id] = scope.deskMembers;
                    angular.extend(scope.desk.orig, res);
                    if (!done) {
                        WizardHandler.wizard('desks').next();
                    } else {
                        WizardHandler.wizard('desks').finish();
                    }
                }, function(response) {
                    if (angular.isDefined(response.data._message)) {
                        scope.message = gettext('Error: ' + response.data._message);
                    } else {
                        scope._errorMessage = gettext('There was a problem, members not saved. Refresh Desks.');
                    }

                }).finally(function() {
                    scope.saving = false;
                    scope.message = null;
                });
            };
        }
    };
}
