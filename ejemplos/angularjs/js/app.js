angular.module('pptApp', [])

.controller('mainController', function($scope, $http) {
	$scope.hideResults = true;

	$scope.repositories = [];

	$scope.loadRepositories = function() {
		$http.get("https://api.github.com/users/ferc/repos")
			.then(function(response) {
				$scope.hideResults = false;

				$scope.repositories = response.data;
			});
	}
});