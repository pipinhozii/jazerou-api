require('dotenv');
const fs = require('fs');
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'zoho',
    auth: {
        user: process.env.email_envio,
        pass: process.env.email_envio_senha
    }
});

module.exports = {
    send(email, nome, token) {
        return new Promise((resolve, reject) => {
            try {
                let body = fs.readFileSync('./Views/_templates_emails/redefinicao_senha.html', 'utf-8');
                body = body.replace("#NOME", nome);
                let replace = new RegExp("#URL_REDEFINICAO", "g");
                body = body.replace(replace, `https://app.confery.com.br/redefinicaoSenha?email=${email}&token=${encodeURIComponent(token)}`);

                let mailOptions = {
                    from: process.env.email_envio,
                    to: email,
                    subject: 'Confery - Redefinição de senha!',
                    html: body
                };

                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        reject(new Error("Não foi possível enviar o e-mail."))
                    } else {
                        if (info.accepted.includes(email)) {
                            console.log(`E-mail de redefinição de senha enviado: ${email}`);
                            resolve();
                        } else {
                            console.log(`Erro ao enviar e-mail de redefinição de senha para: ${email}`);
                            reject(new Error(`Não foi possível enviar o email.`));
                        }
                    }
                });
            } catch (e) {
                reject(e);
            }
        })
    }
}