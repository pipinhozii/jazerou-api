const
    router = require('express').Router()
,   { validationResult } = require('express-validator')
,   { checkSession } = require('../_session.js')
,   api_map = new Map()

function send_assets_files(path) {
	router.get(path, (req,res) => {
		const full_path = `./Views${req.path}`;
		if(require('fs').existsSync(full_path)) {
			res.sendFile(require('path').resolve(full_path));
		} else {
			res.status(404).send();
		}
	})
}

const regex_filename = "([a-zA-Z0-9_-]+).(\\w+)";
const auth_routes = [
    "/backend/private/*"
].map(route => new RegExp(`^${route}/${regex_filename}$`));

module.exports = {
    router, 
    checkAuth: (req, res, next) => {
        checkSession(req, res).then(retorno => {
            if (retorno) {
                req.user_id = Number.parseInt(retorno.key.split(":")[1]);
                req.test_user = retorno.value.test_user ?? 0;
                if(req.params.integration_alias) {
                    req.auth_api = api_map.get(req.params.integration_alias) ?? undefined;
                }

                next();
            } else {
                // Verifico se o caminho é nome de um arquivo
                if(/[a-zA-Z\_\-]+\.[\w\d]+$/g.test(req.baseUrl)) {
                    res.status(401).send();
                } else {
                    res.redirect("/login");
                    // Se não for, redireciono para o login
                }
            }
        })
    }
    , 
}

for(const asset_files_path of auth_routes) {
	send_assets_files(asset_files_path);
    router.use(asset_files_path, module.exports.checkAuth)
} 