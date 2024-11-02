require('dotenv').config();
const { EmbedBuilder } = require('discord.js');
const cron = require('node-cron');

const COMMISSIONER_ID = process.env.COMMISSIONER;
const BOT_OWNER_ID = process.env.BOT_OWNER;
const FREE_TRIAL_START = new Date(2024, 11, 2); // November 2, 2024
const PAYMENT_INTERVAL_DAYS = 28;

function calculateNextPaymentDate(startDate) {
    console.log('Inside Calc for next payment');
    const nextDate = new Date(startDate);
    nextDate.setDate(nextDate.getDate() + PAYMENT_INTERVAL_DAYS);
    return nextDate;
}

function sendFreeTrialMessage(client) {
    console.log('Inside send free trial message');
    const freeTrialEnd = calculateNextPaymentDate(FREE_TRIAL_START);
    [COMMISSIONER_ID, BOT_OWNER_ID].forEach(userId => {
        client.users.fetch(userId)
        .then(user => {
            const embed = new EmbedBuilder()
                .setTitle("Free Trial Active")
                .setDescription(`Your first month is free! The next payment is due on ${freeTrialEnd}.`)
                .setColor(0x00ff00);

            user.send({ embeds: [embed] })
                .then(() => console.log("Free trial message sent."))
                .catch(console.error);
        })
        .catch(console.error);
    });
}

function initializePaymentReminder(client) {
    console.log('Inside initialize payment reminder');
    const today = new Date();
    const freeTrialEnd = calculateNextPaymentDate(FREE_TRIAL_START);
    const weekBeforeTrialEnds = new Date(freeTrialEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`Free Trial End: ${freeTrialEnd}`);
    console.log(`Week Before Trial Ends: ${weekBeforeTrialEnds}`);
    console.log(`Today: ${today}`);

    if (today < weekBeforeTrialEnds) {
        console.log('Still in free trial period, not yet time for payment reminders');
        sendFreeTrialMessage(client);
    } else {
        console.log('Within a week of trial end or after, time for payment reminders');
        sendPaymentReminder(client);
    }

    // Schedule reminders to run daily
    cron.schedule('0 0 * * *', () => sendPaymentReminder(client));
}

function sendPaymentReminder(client) {
    console.log('Inside send payment reminder');
    const today = new Date();
    const freeTrialEnd = calculateNextPaymentDate(FREE_TRIAL_START);
    const nextPaymentDate = freeTrialEnd; // For the first payment, it's the same as the trial end

    console.log('Today:', today);
    console.log('Free Trial End / First Payment Date:', freeTrialEnd);

    const sevenDaysBefore = new Date(nextPaymentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    console.log('Seven days before payment:', sevenDaysBefore);

    if (today >= sevenDaysBefore && today < nextPaymentDate) {
        const daysUntilPayment = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
        console.log(`Sending payment reminder - ${daysUntilPayment} days before`);
        sendReminderMessage(client, "Payment Reminder", `Your free trial ends and first payment is due in ${daysUntilPayment} days on ${nextPaymentDate.toDateString()}. Please prepare the funds.`);
    } else if (today.toDateString() === nextPaymentDate.toDateString()) {
        console.log('Sending payment due reminder - due today');
        sendReminderMessage(client, "Payment Due", "Your free trial has ended. Your first payment is due today. Please make the payment to continue the service.");
    } else {
        console.log('Not within reminder period');
    }
}

function sendReminderMessage(client, title, description) {
    console.log(`Inside send reminder message for ${title}`);
    [COMMISSIONER_ID, BOT_OWNER_ID].forEach(userId => {
        client.users.fetch(userId)
            .then(user => {
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(0xff0000)
                    .addFields(
                        {
                            name: 'Next Payment Date',
                            value: calculateNextPaymentDate(FREE_TRIAL_START).toDateString(),
                            inline: true,
                        },
                        {
                            name: 'Payment Amount (Choose From Available)',
                            value: '1. Fiverr: $5 USD\n2. Paypal: $2.50 USD\n',
                            inline: true,
                        }
                    );

                user.send({ embeds: [embed] })
                    .then(() => console.log(`${title} message sent to ${user.tag}`))
                    .catch(console.error);
            })
            .catch(console.error);
    });
}

module.exports = { initializePaymentReminder };

