function getGithubRepositories() {
	var xmlhttp;

	if (window.XMLHttpRequest) {
		// Código para IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp = new XMLHttpRequest();
	}
	else {
		// Código para IE6, IE5
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}
	
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			var response = JSON.parse(xmlhttp.responseText);

			onReady(response);
		}
	}
	
	xmlhttp.open("GET", "https://api.github.com/users/ferc/repos", true);
	xmlhttp.send();
}

function onReady(repositories) {
	var resultados = document.getElementById("resultados"),
		resultadosCuerpo = document.getElementById("resultados-cuerpo"),
		cuerpo = "",
		repository;


	for(var i = 0; i < repositories.length; i++) {
		repository = repositories[i];
		cuerpo += "<tr>";
		cuerpo += "<td>" + repository.id + "</td>";
		cuerpo += "<td>" + repository.name + "</td>";
		cuerpo += "<td>" + repository.html_url + "</td>";
		cuerpo += "</tr>";
	}

	resultadosCuerpo.innerHTML = cuerpo;
	
	resultados.className = resultados.className.replace(/(?:^|\s)hide(?!\S)/, '');
}

var cargar = document.getElementById("cargar");

if(cargar.attachEvent) {
	// Código para IE8-
	cargar.attachEvent("onclick", getGithubRepositories);
}
else {
	// Código para IE9+, Firefox, Chrome, Opera, Safari
	cargar.addEventListener("click", getGithubRepositories, false);
}