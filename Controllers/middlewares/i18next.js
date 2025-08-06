async function use(req,res,next) {
    const top_menu = {
        button_home: req.t("top_menu.button_home"),
        button_games: req.t("top_menu.button_games"),
        a_login: req.t("top_menu.a_login"),
        a_register: req.t("top_menu.a_register"),
        a_profile: req.t("top_menu.a_profile"),
        a_logoff: req.t("top_menu.a_logoff"),
        search_field: req.t("top_menu.search_field")
    }

	if(req.path.startsWith("/user")) {
        req.locale  = {
            header: req.t('login:header'),
            email: req.t("login:form_email_field"),
            password: req.t("login:form_password_field"),
            remember_check: req.t("login:form_remember_check"),
            submit_button: req.t("login:form_submit_button"),
            label_new_user: req.t("login:label_new_user"),
            label_forgot_password: req.t("login:label_forgot_password"),
            label_resend_email: req.t("login:label_resend_email"),
            top_menu
        }
	} else {
        req.locale = { top_menu }
    }

	next();
}

module.exports = use;