function onReady(repositories) {
	var cuerpo = "",
		repository;

	for(var i = 0; i < repositories.length; i++) {
		repository = repositories[i];
		cuerpo += "<tr>";
		cuerpo += "<td>" + repository.id + "</td>";
		cuerpo += "<td>" + repository.name + "</td>";
		cuerpo += "<td>" + repository.html_url + "</td>";
		cuerpo += "</tr>";
	}

	$("#resultados tbody").html(cuerpo);
	
	$("#resultados").removeClass("hide");
}

$("#cargar").click(function() {
	$.get("https://api.github.com/users/ferc/repos", onReady);
});