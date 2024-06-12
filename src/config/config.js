import { SNSClient } from "@aws-sdk/client-sns";
import nodemailer from "nodemailer";

export const sns = new SNSClient({
  region: process.env.AWS_SNS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY,
  },
});

export const transporter = nodemailer.createTransport({
  service: "gmail", // Using Gmail for this example
  auth: {
    user: process.env.GMAIL_EMAIL_ID,
    pass: process.env.GMAIL_PASSWORD,
  },
});
