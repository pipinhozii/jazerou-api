const
    promise_running_queue = new Map()
,   queue_wait = new Map()
,   DEFAULT_DB_NAME = "ja-zerou"
,   fs = require('fs')
,   path = require('path')
;

require('dotenv').config();
let
    pool
,   mysql = require('mysql2')
,   pools = new Map()
,   db_connected = false
,   connected_dbs = new Set()
,   promise_db_connect = new Map()
,   cache_db = new Map()
;

var general_config = new Map();

function parseURI(uri) {
    let
        user = uri.substring(8, uri.indexOf("@")).split(":")[0]
    ,   password = uri.substring(8, uri.indexOf("@")).split(":")[1]
    ,   host = uri.substring(uri.indexOf("@") + 1, uri.lastIndexOf(":"))
    ,   port = uri.substring(uri.lastIndexOf(":") + 1, uri.lastIndexOf("/"))
    ,   database = uri.substring(uri.lastIndexOf("/") + 1)
    ;

    return {
        user, password, host, port, database,
        connectionLimit: Number.parseInt(process.env.mysql_connections_limit ? process.env.mysql_connections_limit : 10),
        waitForConnections: true,
        connectTimeout: 5000,
        timezone: "-03:00",
        multipleStatements: true
    }
}

async function connect_db(db_name) {
    let pool_;
    if (!promise_db_connect.has(db_name || DEFAULT_DB_NAME)) {
        const parsed_uri = process.env.mysql_local == 1
            ? undefined
            : parseURI(process.env.database_url)
        ;
        
        let promise_db_connect_ = new Promise((resolve, reject) => {
            if (process.env.mysql_local == 1) {
                console.log("Rodando em banco de dados local.")
                pool_ = mysql.createPool({
                    // @ts-ignore
                    port: Number.parseInt(process.env.mysql_port),
                    host: process.env.mysql_host,
                    user: process.env.mysql_user,
                    password: process.env.mysql_pass,
                    database: db_name || process.env.mysql_db,
                    // @ts-ignore
                    connectionLimit: Number.parseInt(process.env.mysql_connections_limit ?? 10),
                    waitForConnections: true,
                    connectTimeout: 5000,
                    timezone: "-03:00",
                    multipleStatements: true
                });
            } else {
                pool_ = mysql.createPool(Object.fromEntries([
                    ...[...Object.entries(parsed_uri)].filter(o => o[0] != "database")
                ]));
            }

            if(!pool || !db_name) {
                pool = pool_;
            }
            
            pools.set(db_name || DEFAULT_DB_NAME, pool_);

            pool_.on('connection', async (connection) => {
                if(parsed_uri) {
                    await connection.promise().query("USE " + (db_name || parsed_uri.database));
                }
                if (!db_name && !db_connected || (db_name && !connected_dbs.has(db_name))) {
                    await connection.promise().query("SET sql_mode = ''");
                    await connection.promise().query("SET SESSION time_zone = '-3:00'");
                    // if(general_config.size == 0 && ((db_name || DEFAULT_DB_NAME) || (parsed_uri && parsed_uri.database)) == DEFAULT_DB_NAME) {
                    //     general_config = await get_general_config(1,connection);
                    //     await fetchConfigIds(connection);
                    // }
                    if(!db_name && !db_connected) db_connected = true;
                    if(db_name && !connected_dbs.has(db_name)) {
                        connected_dbs.add(db_name);
                    }
                }
                resolve(!0);
            });

            pool_.query("SHOW DATABASES", (err, results) => {
                if (err) {
                    reject(err);
                }
            });
        });
        promise_db_connect.set(db_name || DEFAULT_DB_NAME,promise_db_connect_);
        return promise_db_connect_;
    } else {
        return promise_db_connect.get(db_name || DEFAULT_DB_NAME);
    }
}

module.exports = {
    promise_query_wait_queue: (db_name, queue_name, script, values) => new Promise(async (resolve,reject) => {
        function run(db_name_,queue_name_,script_,values_) {
            return new Promise(r => {
                module.exports.promise_query_db(db_name_,script_,values_)
                    .then(result => resolve(result))
                    .catch(error => reject(error))
                    .finally(() => {
                        r();

                        let waiting = queue_wait.get(queue_name_);
                        if(waiting && waiting.length > 0) {
                            let release_queue = waiting.shift();
                            release_queue();
                        }
                        promise_running_queue.delete(queue_name_);
                    })
            })
        }

        let running_queue = promise_running_queue.get(queue_name);
        if(running_queue) {
            let wait_queue_ = (queue_wait.get(queue_name) || [])
            await new Promise(r_queue => queue_wait.set(queue_name, [...wait_queue_,r_queue]));
        }

        promise_running_queue.set(queue_name,run(db_name,queue_name,script,values));
    })
    , promise_query: (script, params) => new Promise(async(resolve, reject) => {
        try {
            async function run() {
                if (!db_connected) await connect_db();
                pool.query(script, params, (err, result) => {
                    if(!err) {
                        resolve(result)
                    } else if(err.message.toLowerCase().includes("connection lost")) {
                        run();
                    } else {
                        reject(err)
                    }
                    
                });
            }

            await run();
        } catch (e) {
            reject(new Error(`promise_query: ${e}`))
        }
    })
    , promise_query_db: (nome_banco, script, params) => new Promise(async(resolve, reject) => {
        try {
            async function run() {
                if (!connected_dbs.has(nome_banco)) await connect_db(nome_banco);
                let pool_ = pools.get(nome_banco);
                if(!pool_) throw new Error("Nenhum banco conectado.");
                pool_.query(script, params, (err, result) => {
                    if(!err) {
                        resolve(result);
                    } else if(err.message.toLowerCase().includes("connection lost")) {
                        run();
                    } else {
                        reject(err)
                    }
                    
                });
            }

            await run();
        } catch (e) {
            reject(new Error(`promise_query: ${script}\r\n${e}`))
        }
    })
    , run_model_script: (db_name, name, params, replacers) => {
        try {
            let
                scripts_dir = path.join(require.main.path, "Models/db_scripts")
            ,   script = fs.readFileSync(path.join(scripts_dir, name)).toString("utf8")
            ;

            if(replacers && replacers instanceof Array) {
                for(const [key, value] of replacers) {
                    script = script.replace(key, value)
                }
            }

            return module.exports.promise_query_db(db_name, script, params);
        } catch (error) {
            return Promise.reject(error);
        }
    }
    , run_model_script_cache: (db_name, name, params, replacers) => {
        try {
            const key = `${db_name}:${name}`;
            if(cache_db.has(key)) {
                return Promise.resolve(cache_db.get(key))
            } else {
                let
                    scripts_dir = path.join(require.main.path, "Models/db_scripts")
                ,   script = fs.readFileSync(path.join(scripts_dir, name)).toString("utf8")
                ;
    
                if(replacers && replacers instanceof Array) {
                    for(const [key, value] of replacers) {
                        script = script.replace(key, value)
                    }
                }
                
                const return_ = module.exports.promise_query_db(db_name, script, params);
                cache_db.set(key, return_);
                return return_;
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }
    , promise_query_db_single_query: (nome_banco, script, params) => new Promise(async(resolve, reject) => {
        try {
            async function run() {
                if (!connected_dbs.has(nome_banco)) await connect_db(nome_banco);
                let pool_ = pools.get(nome_banco);
                pool_.query(script, params, (err, result) => {
                    if(!err) {
                        resolve(result.length > 0 ? result[0] : undefined);
                    } else if(err.message.toLowerCase().includes("connection lost")) {
                        run();
                    } else {
                        reject(new Error(`promise_query_db_single_query/query:\r\n\r\n${script}\r\n${params.toString()}\r\n\r\n${err.message}\r\n${err.stack}`))
                    }
                    
                });
            }

            await run();
        } catch (e) {
            reject(new Error(`promise_query: ${e}`))
        }
    }),
    values_arr_obj: (arr) => {
        function get_obj(obj) {
            if(obj instanceof Array && obj.length == 0) obj = null;
            if(obj instanceof Object && !(obj instanceof Date) && !(obj == null)) {
                return [...Object.values(obj)].map(obj_ => get_obj(obj_))
            } else {
                return [obj];
            }
        }

        return arr.reduce((a,b) => [...Object.values(a),...Object.values(b)],{}).map(obj => get_obj(obj)).flat(Infinity);
    },
    questions_arr_obj: (arr, recursive) => {
        function get_obj(obj) {
            if(obj instanceof Array && obj.length == 0) obj = null;
            if(obj instanceof Object && !(obj instanceof Date) && !(obj == null)) {
                return recursive
                    ? [...Object.values(obj)].map(obj_ => get_obj(obj_))
                    : [...Object.keys(obj)].map(() => "?");
            } else {
                return ['?'];
            }
        }

        return arr.map(object => [...Object.keys(get_obj(object).flat(Infinity))].reduce((a, b, i, arr) => i == arr.length - 1 ? a + "?" : a + "?,", ""))
        .reduce((a,b,i,arr) => i < arr.length - 1 ? `${a} (${b}),` : `${a} (${b})` ,"");
    }
}