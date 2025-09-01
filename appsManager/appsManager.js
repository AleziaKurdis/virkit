//
//  appsManager.js
//
//  Created by Alezia Kurdis, August 28th 2025.
//  Copyright 2025 Overte e.V.
//
//  Applications Manager (prototype).
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var DELAY_IN_MILISECONDS_BEFORE_STARTING = 4000;
    var isReady = false;
    
    var jsMainFileName = "appsManager.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    var APP_NAME = "APPSMAN";
    var APP_URL = ROOT + "appsManager.html";
    let APP_ICON_INACTIVE = ROOT + "appManager_icon_white.png";
    var APP_ICON_ACTIVE = ROOT + "appManager_icon_black.png";
    var ICON_CAPTION_COLOR = "#FFFFFF";

    if (ROOT.substr(0, 4) !== "http") {
        APP_ICON_INACTIVE = ROOT + "appManager_icon_green.png";
        ICON_CAPTION_COLOR = "#00FF00";
    }

    var appStatus = false;
    var channel = "overte.application.ak.appsManager";
    var timestamp = 0;
    var INTERCALL_DELAY = 200; //0.2 sec
    
    var SECURED_APPS_SETTING = "appsManagerSecuredApplications";
    var securedApps = Settings.getValue(SECURED_APPS_SETTING, []);
    
    var tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    tablet.screenChanged.connect(onScreenChanged);

    var button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE,
        captionColor: ICON_CAPTION_COLOR,
        buttonEnabled: false
    });


    function clicked(){
        if (isReady) {
            var colorCaption;
            if (appStatus === true) {
                tablet.webEventReceived.disconnect(onAppWebEventReceived);
                tablet.gotoHomeScreen();
                colorCaption = ICON_CAPTION_COLOR;
                appStatus = false;
            }else{
                tablet.gotoWebScreen(APP_URL);
                tablet.webEventReceived.connect(onAppWebEventReceived);
                colorCaption = "#000000";
                appStatus = true;
            }

            button.editProperties({
                isActive: appStatus,
                captionColor: colorCaption
            });
        }
    }

    button.clicked.connect(clicked);

    //This recieved the message from the UI(html) for a specific actions
    function onAppWebEventReceived(message) {
        if (typeof message === "string") {
            var d = new Date();
            var n = d.getTime();
            let instruction;
            try {
                instruction = JSON.parse(message);
            } catch (e) {
                print("Invalid JSON from UI:", message);
                return;
            }
            if (instruction.channel === channel) {
                if (instruction.action === "SECURE" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    actionSecure(instruction.url);
                } else if (instruction.action === "UNSECURE" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    actionUnsecure(instruction.url);
                } else if (instruction.action === "STOP" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    actionStop(instruction.url);
                } else if (instruction.action === "RELOAD" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    actionReload(instruction.url);
                } else if (instruction.action === "LOAD" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    actionLoad(instruction.url);
                } else if (instruction.action === "UI_READY") {
                    sendDataToUI();
                } else if (instruction.action === "SELF_UNINSTALL" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    ScriptDiscoveryService.stopScript(Script.resolvePath(''), false);
                }
            }
        }
    }

    function actionSecure(url) {
        if (securedApps.indexOf(url) === -1) {
            securedApps.push(url);
            Settings.setValue(SECURED_APPS_SETTING, securedApps);
            sendDataToUI();
        }
    }

    function actionUnsecure(url) {
        let index = securedApps.indexOf(url);
        if (index !== -1) {
            securedApps.splice(index, 1);
            Settings.setValue(SECURED_APPS_SETTING, securedApps);
            sendDataToUI();
        }
    }

    function actionStop(url) {
        ScriptDiscoveryService.stopScript(url, false);
        Script.setTimeout(function () {
            sendDataToUI();
        }, 1000);
    }

    function actionReload(url) {
        ScriptDiscoveryService.stopScript(url, true);
        Script.setTimeout(function () {
            sendDataToUI();
        }, 1000);
    }

    function actionLoad(url) {
        ScriptDiscoveryService.loadOneScript(url);
        Script.setTimeout(function () {
            sendDataToUI();
        }, 1000);
    }

    function sendDataToUI() {
        var messageToSend = JSON.stringify({
            "channel": channel,
            "action": "GET_DATA",
            "data": getAppsProcessedData()
        });
        tablet.emitScriptEvent(messageToSend);
    }

    function onScreenChanged(type, url) {
        var colorCaption;
        if (type === "Web" && url.indexOf(APP_URL) !== -1) {
            colorCaption = "#000000";
            appStatus = true;

        } else {
            colorCaption = ICON_CAPTION_COLOR;
            appStatus = false;
        }
        
        button.editProperties({
            isActive: appStatus,
            captionColor: colorCaption
        });
    }

    function cleanup() {

        if (appStatus) {
            tablet.gotoHomeScreen();
            tablet.webEventReceived.disconnect(onAppWebEventReceived);
        }

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
    
    function getAppsProcessedData() {
        var appsList = [];
        var failedApps = [];
        
        var allApps = ScriptDiscoveryService.getRunning();
        for (let i = 0; i < allApps.length; i++) {
            if (!allApps[i].local) {
                appsList.push({
                    "name": allApps[i].name,  //Could be replaced by the name from the metadata.js if found (deduced from the url)
                    "url": allApps[i].path,
                    "isSecured": getAppSecuredState(allApps[i].path)
                });
            }
        }

        for (let i = 0; i < securedApps.length; i++) {
            if (JSON.stringify(allApps).indexOf(securedApps[i]) === -1){
                failedApps.push({
                    "name": getNameFromUrl(securedApps[i]), //Could be replaced by the name from the metadata.js if found (deduced from the url)
                    "url": securedApps[i],
                    "isSecured": true
                });
            }
        }
        
        return {
            "appsList": appsList, 
            "failedApps": failedApps
        };
    }
    
    function getAppSecuredState(url) {
        var state = false;
        for (let i = 0; i < securedApps.length; i++) {
            if (securedApps[i] === url) {
                state = true;
                break;
            }
        }
        return state;
    }
    
    function getNameFromUrl(url) {
        if (!url) return "";
        return url.split('/').pop().split('\\').pop();
    }
    
    Script.setTimeout(function () {
        var currentAppData = getAppsProcessedData();
        var failedApps = currentAppData.failedApps;
        for (let i = 0; i < failedApps.length; i++) {
            ScriptDiscoveryService.loadOneScript(failedApps[i].url);
        }
        isReady = true;
        button.editProperties({
            text: APP_NAME,
            icon: APP_ICON_INACTIVE,
            activeIcon: APP_ICON_ACTIVE,
            captionColor: ICON_CAPTION_COLOR,
            buttonEnabled: true
        });
    }, DELAY_IN_MILISECONDS_BEFORE_STARTING); 
    
}());
