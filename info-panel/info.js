"use strict";
//
//  info.js
//
//  Created by Alezia Kurdis, May 4th, 2022.
//  Copyright 2022, Alezia Kurdis.
//
//  information panel displayer.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    var jsMainFileName = "info.js";
    var ROOT = Script.resolvePath('').split(jsMainFileName)[0];

    var MAX_CLICKABLE_DISTANCE_M = 10;
    var appScriptUrl = ROOT + "app-ready-player-me.js";
    
    var panelUrl;
    var panelID = Uuid.NULL;
    var thisEntityID;

    this.preload = function(entityID) {
        thisEntityID = entityID;
        var properties = Entities.getEntityProperties(entityID, ["userData"]);
        panelUrl = properties.userData;
    }


    this.leaveEntity = function(entityID) {
        //do nothing.
        if (panelID !== Uuid.NULL) {
            Entities.deleteEntity(panelID);
        }
    };

    // Constructor
    var _this = null;

    function clickableUI() {
        _this = this;
        this.entityID = null;
    }

    // Entity methods
    clickableUI.prototype = {
        preload: function (id) {
            _this.entityID = id;
            HMD.displayModeChanged.connect(this.displayModeChangedCallback);
        },

        displayModeChangedCallback: function() {
            if (_this && _this.entityID) {
                //Nothing
            }
        },

        mousePressOnEntity: function (entityID, event) {
            if (event.isPrimaryButton && 
                Vec3.distance(MyAvatar.position, Entities.getEntityProperties(_this.entityID, ["position"]).position) <= MAX_CLICKABLE_DISTANCE_M) {
                
                print("CLICKED!");
                if (panelID === Uuid.NULL) {
                    panelID = Entities.addEntity({
                        "parentID": thisEntityID,
                        "localPosition": {
                            "x": 0,
                            "y": 0.6,
                            "z": 0
                        },
                        "type": "Image",
                        "name": "Info",
                        "dimensions": {
                            "x": 1,
                            "y": 1,
                            "z": 0.009999999776482582
                        },
                        "billboardMode": "yaw",
                        "grab": {
                            "grabbable": false
                        },
                        "collisionless": true,
                        "ignoreForCollisions": true,
                        "imageURL": panelUrl,
                        "emissive": true,
                        "keepAspectRatio": false,
                    },"local");
                    print(panelID);
                }
                
            }
        },

        unload: function () {
            HMD.displayModeChanged.disconnect(this.displayModeChangedCallback);
        }
    };

    
    return new clickableUI();


});