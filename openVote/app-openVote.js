//
//  app-openVote.js
//
//  Created by Alezia Kurdis, October 20th 2025.
//  Copyright 2025 Overte e.V.
//
//  Voting application for Overte community.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//
(function() {
    const jsMainFileName = "app-openVote.js";
    const ROOT = Script.resolvePath('').split(jsMainFileName)[0];
    
    const APP_NAME = "VOTE";
    const APP_URL = ROOT + "html/openVote.html";
    const APP_ICON_INACTIVE = ROOT + "icon_openVote_inactive.png";
    const APP_ICON_ACTIVE = ROOT + "icon_openVote_active.png";
    const ICON_CAPTION_COLOR = "#FFFFFF";
    let appStatus = false;
    const channel = "overte.application.more.openVote";
    let timestamp = 0;
    const INTERCALL_DELAY = 200; //0.2 sec
    
    const UPDATE_TIMER_INTERVAL = 10000; // 10 sec 
    let processTimer = 0;
    const voteChannelName = "overte.openVote.votation";
    
    let openVote = {
        "voters": [],
        "polls": [],
        "sessionUUID": MyAvatar.sessionUUID,
        "isAnonymous": !AccountServices.loggedIn
    };
    
    let myPolls = [];
    let myVotes = [];
    
    let tablet = Tablet.getTablet("com.highfidelity.interface.tablet.system");

    tablet.screenChanged.connect(onScreenChanged);

    let button = tablet.addButton({
        text: APP_NAME,
        icon: APP_ICON_INACTIVE,
        activeIcon: APP_ICON_ACTIVE,
        captionColor: ICON_CAPTION_COLOR,
        sortOrder: 1
    });


    function myTimer(deltaTime) {
        let today = new Date();
        if ((today.getTime() - processTimer) > UPDATE_TIMER_INTERVAL ) {
            
            broadcastMyPolls();
            broadcastAsVoter();
            clearGoneVoters();
            broadcastMyVotes();
            openVote.sessionUUID = MyAvatar.sessionUUID;
            openVote.isAnonymous = !AccountServices.loggedIn;
            if (appStatus) {
                sendDataToUi();
            }
            today = new Date();
            processTimer = today.getTime();
        }  
    }

    function sendDataToUi() {
        let messageToSend = {
            "channel": channel,
            "action": "updateData",
            "data": openVote
        };
        tablet.emitScriptEvent(JSON.stringify(messageToSend));
    }

    function clearGoneVoters() {
		let present = AvatarManager.getAvatarIdentifiers();
		present = present.map(id => id || MyAvatar.sessionUUID);

		if (!present.includes(MyAvatar.sessionUUID)) {
    		present.push(MyAvatar.sessionUUID);
		}
        openVote.voters = openVote.voters.filter(voter =>
            present.indexOf(voter.sessionUUID) !== -1
        );
    }

    function broadcastAsVoter() {
        let messageToSent = {
            "action": "voter_registration",
            "displayName": MyAvatar.displayName,
            "username": AccountServices.username,
            "isAnonymous": !AccountServices.loggedIn,
            "sessionUUID": MyAvatar.sessionUUID
        };
        
        Messages.sendMessage(voteChannelName, JSON.stringify(messageToSent));
    }

    //from voters and pollers
    function onMessageReceived( rChannel, rMessage, rSenderID, rLocalOnly ) {
        let request;
        if (rChannel === voteChannelName) {
            try {
                request = JSON.parse(rMessage);
            } catch (e) {
                print("Failed to parse JSON:", e.message);
                return;
            }
        	if (request.action === "voter_registration") {
            	addVoter(request);
                if (appStatus) {
            		sendDataToUi();
            	}
        	} else if (request.action === "poll_registration") {
            	addPoll(request);
                if (appStatus) {
            		sendDataToUi();
            	}
            } else if (request.action === "vote_registration") {
            	addVote(request);
                if (appStatus) {
            		sendDataToUi();
            	}
            }
        }
    }

    function addVote(request) {
        updateVote(openVote.polls, request);
        updateVote(myPolls, request);
    }

    function updateVote(pollsArray, request) {
        for (let i = 0; i < pollsArray.length; i++) {
            if (pollsArray[i].id === request.data.id) {
                for (let j = 0; j < pollsArray[i].results.length; j++) {
                    const r = pollsArray[i].results[j];
                    if (r.sessionUUID === request.data.sessionUUID && !r.hasVoted) {
                        r.vote = request.data.vote;
                        r.hasVoted = true; 
                        break;
                    }
                }
                break;
            }
        }
    }

    function addPoll(request) {
        let toAdd = true;
        for (let i = 0; i < openVote.polls.length; i++) {
            if (openVote.polls[i].id === request.data.id) {
                toAdd = false;
                openVote.polls[i] = request.data;
                break;
            }
        }
        if (toAdd) {
        	openVote.polls.push(request.data);
        }
    }

    function addVoter(data) {
        let toAdd = true;
        for (let i = 0; i < openVote.voters.length; i++) {
            if (openVote.voters[i].username === data.username && openVote.voters[i].sessionUUID === data.sessionUUID) {
                toAdd = false;
                break;
            }
        }
        if (toAdd) {
        	let newVoter = {
            	"displayName": data.displayName,
            	"username": data.username,
            	"isAnonymous": data.isAnonymous,
            	"sessionUUID": data.sessionUUID
        	};
        	openVote.voters.push(newVoter);
        }
    }

    function deletePoll(id) {
        for (let i = 0; i < myPolls.length; i++) {
            if (myPolls[i].id === id) {
                myPolls[i].state = "DELETED";
            }
        }
        broadcastMyPolls();
        if (appStatus) {
            sendDataToUi();
        }
    }

    function announcePoll(id) {
        for (let i = 0; i < myPolls.length; i++) {
            if (myPolls[i].id === id) {
                myPolls[i].state = "PENDING";
            }
        }
        broadcastMyPolls();
        if (appStatus) {
            sendDataToUi();
        }
    }

    function closePoll(id) {
        for (let i = 0; i < myPolls.length; i++) {
            if (myPolls[i].id === id) {
                myPolls[i].state = "CLOSED";
            }
        }
        broadcastMyPolls();
        if (appStatus) {
            sendDataToUi();
        }
    }

    function openPoll(id) {
        for (let i = 0; i < myPolls.length; i++) {
            if (myPolls[i].id === id) {
                myPolls[i].state = "OPEN";
                let d = new Date();
                let n = d.getTime();
                myPolls[i].voteExpirationTime = n + myPolls[i].duration * 60000;
                myPolls[i].voteRemainingTime = myPolls[i].duration * 60000;
                //copy the electoral List for this vote
                for (let j = 0; j < openVote.voters.length; j++) {
                    if ((openVote.voters[j].isAnonymous && myPolls[i].allowAnonymous) || !openVote.voters[j].isAnonymous) {
                        let name = openVote.voters[j].displayName;
                        if (!name && openVote.voters[j].isAnonymous) {
                            name = getAnnonymousName(openVote.voters[j].sessionUUID);
                        }
                        let voter = {
                            "sessionUUID": openVote.voters[j].sessionUUID,
                            "name": openVote.voters[j].displayName ,
                            "vote": [],
                            "hasVoted": false
                        };
                        
                        myPolls[i].results.push(voter);
                    }
                }
            }
        }
        broadcastMyPolls();
        if (appStatus) {
            sendDataToUi();
        }
    }

    function getAnnonymousName(id) {
        return "Anonymous " + id.substring(1, 6);
    }

    function createPoll(question, choices, isPreferential, allowAnonymous, isSecretVote, duration) {
        let poll = {};
        poll.id = Uuid.generate();
        poll.question = question;
        poll.choices = choices;
        poll.isPreferential = isPreferential;
        poll.allowAnonymous = allowAnonymous;
        poll.isSecretVote = isSecretVote;
        poll.owner = MyAvatar.sessionUUID;
        poll.state = "DRAFT";
        poll.results = [];
        poll.duration = duration;
        myPolls.push(poll);
        
        broadcastMyPolls();
        if (appStatus) {
            sendDataToUi();
        }
    }

    function broadcastMyPolls() {
        let messageToSend;
        
        for (let i = 0; i < myPolls.length; i++ ) {
            
            if (myPolls[i].state === "OPEN") {
                let d = new Date();
                let n = d.getTime();
                if (myPolls[i].voteExpirationTime < n) {
                    closePoll(myPolls[i].id);
                } else {
                    myPolls[i].voteRemainingTime = myPolls[i].voteExpirationTime - n;
                }
            }

            messageToSend = {
                "action": "poll_registration",
                "data": myPolls[i]
            };
            
            Messages.sendMessage(voteChannelName, JSON.stringify(messageToSend));
        }
    }

    function votingPoll(id, sessionUUID, vote) {
        let theVote = {};
        theVote.id = id;
        theVote.sessionUUID = sessionUUID;
        theVote.vote = vote;
        theVote.hasVoted = true;
        myVotes.push(theVote);
        
        broadcastMyVotes();
        if (appStatus) {
            sendDataToUi();
        }
    }

    function broadcastMyVotes() {
        let messageToSend;
        
        for (let i = 0; i < myVotes.length; i++ ) {
            
            messageToSend = {
                "action": "vote_registration",
                "data": myVotes[i]
            };
            
            Messages.sendMessage(voteChannelName, JSON.stringify(messageToSend));
        }
    }


    function clicked(){
        if (location.domainID === Uuid.NONE) {
            Window.displayAnnouncement("ATTENTION! This application can only work on a domain. Never on a serverless.");
            return;
        }
        
        let colorCaption;
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

    button.clicked.connect(clicked);

    //This recieved the message from the UI(html) for a specific actions
    function onAppWebEventReceived(message) {
        if (typeof message === "string") {
            let d = new Date();
            let n = d.getTime();
            let instruction = JSON.parse(message);
            if (instruction.channel === channel) {
                if (instruction.action === "Create_Poll" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    
                    createPoll(instruction.question, instruction.choices, instruction.isPreferential, instruction.allowAnonymous, instruction.isSecretVote, instruction.duration);

                } else if (instruction.action === "delete_Poll" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    
                    deletePoll(instruction.id);

                } else if (instruction.action === "announce_Poll" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    
                    announcePoll(instruction.id);

                } else if (instruction.action === "close_Poll" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    
                    closePoll(instruction.id);

                } else if (instruction.action === "open_Poll" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    
                    openPoll(instruction.id);

                } else if (instruction.action === "voting" && (n - timestamp) > INTERCALL_DELAY) {
                    d = new Date();
                    timestamp = d.getTime();
                    
                    votingPoll(instruction.pollID, instruction.sessionUUID, instruction.vote);

                } else if (instruction.action === "SCRIPT_CALLED_ACTION_NAME") { //<== Use this for action trigger the UI script processing. (whithout delay)
                    //Call a function to do something here
                }
            }
        }
    }

    function onScreenChanged(type, url) {
        let colorCaption;
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

        Script.update.disconnect(myTimer);
        Messages.messageReceived.disconnect(onMessageReceived);
        Messages.unsubscribe(voteChannelName);

        tablet.screenChanged.disconnect(onScreenChanged);
        tablet.removeButton(button);
    }

    Script.scriptEnding.connect(cleanup);
    Script.update.connect(myTimer);
    Messages.subscribe(voteChannelName);
    Messages.messageReceived.connect(onMessageReceived);
}());
