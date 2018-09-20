/**
 * BoTG Comms Notification Bot
 * Demannu (me@demannu.com)
 * A basic notification script for http://baronsofthegalaxy.com, send notification to Telegram and Discord.
 */

const rp = require('request');
const cheerio = require('cheerio');
var request = rp.defaults({jar: true});

var config = require('./config.js');
const mongoose = require('mongoose');
var Comms = require('./comms.js');

const Discord = require('discord.js');
const client = new Discord.Client();

mongoose.connect(config.db);
client.login(config.discord.token);

client.on('ready', () => {
    scrapeComms(client);
    setInterval(function(){scrapeComms(client);}, 60000);
    discordNotify("GNS is Online! \n(see !about for more)")
    telegramNotify("Test")
});

client.on('message', message => {
    if(message.content === '!about'){
        message.channel.send('***Galactic News Service*** - **Automated Comms Notification** \n**Developer:** Demannu **Version:** ' + config.version)
    }
});

function telegramNotify(message){
    for(var chan in config.telegram.channel){
        request.post({
            url: "https://api.telegram.org/bot" + config.telegram.token + "/sendMessage", 
            form: {"parse_mode": "HTML", "text": message, "chat_id": config.telegram.channel[chan]}
        })
    }
}

function discordNotify(message){
    for(var chan in config.discord.channel){
        var channel = client.channels.find(x => x.name == config.discord.channel[chan])
        channel.send(message);
    }
}

function scrapeComms(client){
    request.get("http://baronsofthegalaxy.com/Default.aspx", function(error, response, body){
        var $ = cheerio.load(body);
        var viewState = $("#__VIEWSTATE").val()
        var viewGenerate = $("#__VIEWSTATEGENERATOR").val()
        var eventValid = $("#__EVENTVALIDATION").val()
        var commsPost = []
        request.post({url: "http://baronsofthegalaxy.com/Default.aspx", form:{"__VIEWSTATE": viewState, "__VIEWSTATEGENERATOR": viewGenerate, "__EVENTVALIDATION": eventValid, "ctl00$tbHomeUsername": config.botg.user, "ctl00$tbHomePassword": config.botg.pass, "ctl00$btnLogin": "Login"}}, function(error, response, body){
            request.get("http://baronsofthegalaxy.com/login.aspx", function(error, response, body){
                request.get("http://baronsofthegalaxy.com/comms.aspx", function(error, response, body){
                    $ = cheerio.load(body)
                    var commTable = $("#ctl00_ContentPlaceHolder1_gvCommDisplayThread").find("tr").each((i, elm)=>{
                        var channel = $(elm).children().eq(2).text()
                        var title = $(elm).children().eq(4).text()
                        var replies = $(elm).children().eq(5).text()
                        var author = $(elm).children().eq(7).text()
                        var last = $(elm).children().eq(8).text()
                        commsPost.push({channel: channel, title: title, replies: replies, author:author, last:last})                        
                    })
                    commsPost.forEach(function(elm){
                        Comms.findOrCreate({channel: elm.channel, title: elm.title, author: elm.author}, function(err, comm, created){
                            if(err){
                                console.log("ERROR: " + err)
                            }
                            if(created){
                                if(comm.title !== undefined){
                                    telegramNotify("<b>New Comms</b> - " + comm.channel + " \n <b>" + comm.title + "</b> \n [" + comm.author + "]" )
                                    discordNotify("@here ***New Comms*** - **" + comm.channel + "** \n **Title:** " + comm.title + " \n **Author:** " + comm.author)
                                }
                                comm.replies = Number(elm.replies);
                                comm.save((err)=>{
                                    if(err){
                                        console.log(err)
                                    }
                                })
                                
                            } else {
                                if(comm.replies && Number(comm.replies) < Number(elm.replies)){
                                    telegramNotify("<b>New Reply</b> - " + comm.channel + " \n <b>" + comm.title + "</b> [" + elm.replies + "] \n " + elm.last)
                                    discordNotify("@here ***New Reply*** - **" + comm.channel + "** \n **Title:** " + comm.title + " **[" + elm.replies + "]** \n " + elm.last)
                                    comm.replies = Number(elm.replies)
                                    comm.last = elm.last
                                    comm.save((err)=>{
                                        if(err){
                                            console.log("ERROR # : " + err)
                                        }
                                    })
                                } 
                            }
                        })
                    })                   
                })
            })
        })
    })
}

