/*jslint sloppy: true*/
/*global require, module*/
var express = require('express'),
    app = express(),
    path = require('path'),
    under = require('underscore'),
    notification = require('../notification/notification');

var configure = function (config, devices, push, pwd) {
    var fail, send, save, clean, render, alias, log, redirect,
        rootPath = path.resolve(pwd),
        publicPath = path.resolve(path.join(rootPath, '/public/'));

    fail = function (req, res) {
        res.send("KO");
    };
        
    render = function (req, res) {
        res.sendfile(path.join(publicPath, 'send.html'));
    };
    
    send = function (req, res) {
        var type = '',
            formatted_note = notification.format(req.body),
            message = notification.compatible(formatted_note, devices, pwd),
            callback = function () {
                push.send(message, function () {
                    render(req, res);
                });
            },
            count = under.min([under.keys(devices).length, under.keys(message).length - 1]),
            do_cb = under.after(count, callback);
        for (type in devices) {
            if (devices.hasOwnProperty(type) && message.hasOwnProperty(type)) {
                //Closure to keep device type
                (function (platform) {
                    if (req.body.alias) {
                        devices[type].list(function (ids) {
                            if (ids) {
                                message[platform] = ids;
                            }
                            do_cb();
                        }, req.body.alias);
                    } else {
                        devices[type].list(function (ids) {
                            if (ids) {
                                message[platform] = ids;
                            }
                            do_cb();
                        });
                    }
                }(type));
            }
        }
    };
    
    save = function (req, res) {
        if (req.body.hasOwnProperty('type') && req.body.type !== '') {
            devices[req.body.type].save(req.body.token);
            render(req, res);
        } else {
            fail(req, res);
        }
    };
    
    clean = function (req, res) {
        if (req.body.hasOwnProperty('type') && req.body.type !== '') {
            devices[req.body.type].clean(req.body.token);
            render(req, res);
        } else {
            fail(req, res);
        }
    };
    
    alias = function (req, res) {
        if (req.body.hasOwnProperty('type') && req.body.type !== '') {
            devices[req.body.type].alias(req.body.token, req.body.alias);
            render(req, res);
        } else {
            fail(req, res);
        }
    };
    
    redirect = function(req, res) {
        res.redirect("/send");
    };
    
    log = function (req, res, next) {
        if (config.debug === true) {
            console.log('request ' + req.path + ' ' +
                        '[type : ' + (req.body.type || 'web') + '] ' +
                        '[token : ' + (req.body.token || 'no token') + ']'
                       );
        }
        next();
    };
    
    app.listen(config.port);
    app.use(express['static'](publicPath));
    app.use(express.bodyParser());
    app.all("*", log);
    app.get("/", redirect);
    app.get("/send", render);
    app.post("/send", send);
    app.post("/save", save);
    app.post("/clean", clean);
    app.post("/subscribe", save); //Alias for route save
    app.post("/unsubscribe", clean); //Alias for route clean
    app.post("/alias", alias);
    app.all("*", function (req,res) {
        res.sendfile(path.join(publicPath, '404.html'));
	});
};

module.exports.configure = configure;
