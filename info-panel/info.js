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
    
    var panelID = Uuid.NULL;

    
    var NBRSEC_DISPLAYED = 8; //8 sec.

    this.preload = function(entityID) {
        thisEntityID = entityID;
        var properties = Entities.getEntityProperties(entityID, ["userData"]);
        panelUrl = JSON.stringify(properties.userData);
    }


    this.leaveEntity = function(entityID) {
        if (panelID !== Uuid.NULL) {
            Entities.deleteEntity(panelID);
            panelID = Uuid.NULL;
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
                
                var properties = Entities.getEntityProperties(entityID, ["userData", "dimensions"]);
                var panelUrl = properties.userData;
                
                print("CLICKED! " + panelUrl);
                if (panelID === Uuid.NULL) {
                    panelID = Entities.addEntity({
                        "parentID": entityID,
                        "localPosition": {
                            "x": 0,
                            "y": 0,
                            "z": properties.dimensions.z + 0.2
                        },
                        "type": "Image",
                        "name": "Info",
                        "dimensions": {
                            "x": 1,
                            "y": 1,
                            "z": 0.009999999776482582
                        },
                        "grab": {
                            "grabbable": false
                        },
                        "imageURL": panelUrl,
                        "emissive": true,
                        "keepAspectRatio": false,
                    },"local");

                    Script.setTimeout(function () {
                        if (panelID !== Uuid.NULL) {
                            Entities.deleteEntity(panelID);
                            panelID = Uuid.NULL;
                        }
                    }, NBRSEC_DISPLAYED * 1000);

                }
                
            }
        },

        unload: function () {
            HMD.displayModeChanged.disconnect(this.displayModeChangedCallback);
        }
    };

    
    return new clickableUI();


});