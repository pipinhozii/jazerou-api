const
    router = require('express').Router()
,   { body, checkExact, Result } = require('express-validator')
,   { run_model_script } = require('../db')
,   { return_if_validation_errors } = require('./_static')
,   ten_minute_domains = require('disposable-email-domains')
,   wildcards = require('disposable-email-domains/wildcard.json')
,   { get_default_salty_hash } = require('../crypto')
,   session = require('../_session')
,   MAIN_DB = 'ja-zerou'
;

router
    .post('/user/login',
        body().custom(async(input, meta) => {
            const
                salty_password = get_default_salty_hash(input.password)
            ,   row = await run_model_script(MAIN_DB, "backend/user/select_by_password.sql", undefined,
                    [
                        [":email",input.username_email],
                        [":username",input.username_email],
                        [":password",salty_password]
                    ])
                    .then(rows => rows[0])
            ,   user_id = row ? row.id : undefined

            if(!user_id) {
                input.password = input.password.replace(/./g,"*");
                throw "Invalid login or password.";
            } else {
                meta.req.user_id = user_id;
                return !0;
            }
        })
        , return_if_validation_errors
        , async (req,res) => {
        try {
            const
                { hash } = await session.createSession(req,res,req.user_id)
            ,   six_hours = ((60 * 1000) * 60) * 6
            ;

            res.cookie('__session', hash, {secure: true, maxAge: six_hours, signed: true});
            res.status(204).send();
        } catch (error) {
            res.status(500).send();
        }
    })
    .post("/user/logoff", (req,res) => {
        try {
            const __session = req.signedCookies['__session'];
            session.removeSession(__session);
            res.clearCookie("__session");
            res.status(204).send();
        } catch (error) {
            res.status(500).send();
        }
    })
    .post('/user/register'
    ,   body("username").isAlphanumeric().isLength({min: 1, max: 20})
    ,   body("password").matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/)
    ,   body("email").isEmail().custom((input,meta) => {
        const
            domain = input.split("@")
        ,   is_10minute = (wildcards.findIndex(domain_ => domain_ == domain) > -1 || ten_minute_domains.findIndex(domain_ => domain_ == domain) > -1);

        return !is_10minute;
    })
    ,   body().custom(async(input, meta) => {
        const db_result = await run_model_script(MAIN_DB, "backend/user/select_by_email_user.sql",undefined,[
            [":email",input.email],
            [":username",input.username]
        ])
        .then(rows => rows[0])
        .catch(console.error)

        if(db_result && (db_result.exist_email || db_result.exist_user)) {
        meta.pathValues = ['email', 'username']
        let errors =
            db_result.exist_email && db_result.exist_user
                ? [["email","username"], ["email has been taken","username has been taken"]]
            : db_result.exist_email
                ? [["email"], ["email has been taken"]]
            : db_result.exist_user
                ? [["username"], ["username has been taken"]]
            : undefined
            ;
            meta.path = errors ? errors[0] : "";
            throw errors[1]
        } else {
            return !0;
        }
    })
    , return_if_validation_errors
    , async(req,res) => {
        try {
            const crypto_password = get_default_salty_hash(req.body.password)
            const db_result = await run_model_script(MAIN_DB, "backend/user/insert.sql",undefined,[
                [":email",req.body.email ?? ""],
                [":password",crypto_password ?? ""],
                [":username",req.body.username ?? ""],
                [":avatar_url",req.body.avatar_url ?? ""],
                [":biography",req.body.biography ?? ""],
            ]);

            if(db_result.affectedRows) {
                const { hash } = await session.createSession(req,res,db_result.insertId);
                const six_hours = ((60 * 1000) * 60) * 6;
                res.cookie('__session', hash, {secure: true, maxAge: six_hours, signed: true});
                res.status(204).send();
            } else {
                throw new Error("Lines not affected.");
            }
        } catch (error) {
            res.status(500).send();
        }
    })
    .post('/user/reset-password', (req,res) => {
        try {
            
        } catch (error) {
            
        }
    })
    .post("/user/follow/:user_id", async (req,res) => {
        try {
            const
                follower_id = req.user_id
            ,   following_id = req.params.user_id
            ;

            await run_model_script(MAIN_DB, "backend/user_follow/insert.sql",[follower_id, following_id])
                .then(result => {
                    console.log(result);
                    res.status(204).send()
                })
        } catch (error) {
            res.status(500).send();
        }
    })
    .post("/user/unfollow/:user_id", async (req,res) => {
        try {
            const
                follower_id = req.user_id
            ,   following_id = req.params.user_id
            ;

            await run_model_script(MAIN_DB, "backend/user_follow/delete.sql",[follower_id, following_id])
                .then(result => {
                    console.log(result);
                    res.status(204).send()
                })
        } catch (error) {
            res.status(500).send();
        }
    })
;

module.exports = { router }