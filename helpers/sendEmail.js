const nodemailer = require("nodemailer");
require("dotenv").config();

const { META_PASSWORD } = process.env;

const sendEmail = async (data) => {
  const nodemailerConfig = {
    host: "smtp.meta.ua",
    port: 465, //25, 465, 2525
    secure: true,
    auth: {
      user: "alex.xag@meta.ua",
      pass: META_PASSWORD,
    },
  };

  const transport = nodemailer.createTransport(nodemailerConfig);
  const email = { ...data, from: "alex.xag@meta.ua" };
  transport
    .sendMail(email)
    .then(() => console.log("Email send success"))
    .catch((err) => console.log(err.message));

  return true;
};

module.exports = sendEmail;

// const sgMail = require("@sendgrid/mail");
// require("dotenv").config();

// const { SENDGRID_API_KEY } = process.env;

// sgMail.setApiKey(SENDGRID_API_KEY);

// const sendEmail = async (data) => {
//   const email = { ...data, from: "alex.xag1987@gmail.com" };
//   await sgMail.send(email); //.then(() => console.log("Email send successfuly"))
//   //.catch((err) => console.log(err.message));
//   return true;
// };

// module.exports = sendEmail;

// const email = {
//   to: "example@.mail.com",
//   from: "alex.xag1987@gmail.com",
//   subject: "Test email",
//   html: "<p><strong>Test email</strong> from localhost:3000</p>",
// };
